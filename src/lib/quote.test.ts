import { describe, expect, it } from 'vitest'
import { crewSize } from './crew'
import { computeQuote, labourLine, lineWeeks, newLineId, personHours, quoteCrew, quoteKit } from './quote'
import { buildSeed } from './seed'
import type { Quote, QuoteLine } from './types'

const line = (p: Partial<QuoteLine>): QuoteLine => ({ id: newLineId(), kind: 'other', description: 'x', qty: 1, unitPrice: 0, unitCost: 0, ...p })
const q = (lines: QuoteLine[], extra: Partial<Quote> = {}) => ({ lines, hireWeeks: 4, depositEnabled: false, depositPct: 20, ...extra })

describe('quote cost / profit / margin', () => {
  it('prices kit per unit per week and sums costs, profit and margin (profit ÷ revenue)', () => {
    const t = computeQuote(
      q([
        line({ kind: 'kit', qty: 10, unitPrice: 5, unitCost: 1 }), // 10 × 5 × 4 = 200 sell, 40 cost
        line({ kind: 'labour', qty: 8, unitPrice: 80, unitCost: 50 }), // 640 / 400
        line({ kind: 'transport', qty: 2, unitPrice: 100, unitCost: 60 }), // 200 / 120
      ]),
    )
    expect(t.sell).toBe(1040)
    expect(t.cost).toBe(560)
    expect(t.profit).toBe(480)
    expect(t.marginPct).toBeCloseTo((480 / 1040) * 100, 6) // margin, not markup (86%)
    expect(t.byKind.kit).toEqual({ sell: 200, cost: 40 })
  })

  it('zero revenue: margin is 0 and flagged undefined, no NaN/Infinity', () => {
    const t = computeQuote(q([line({ kind: 'transport', qty: 1, unitPrice: 0, unitCost: 300 })]))
    expect(t.sell).toBe(0)
    expect(t.profit).toBe(-300)
    expect(t.marginPct).toBe(0)
    expect(t.marginDefined).toBe(false)
    expect(computeQuote(q([])).deposit).toBe(0)
  })

  it('guards invalid numbers (NaN, negative qty/cost, bad weeks)', () => {
    const t = computeQuote(q([line({ kind: 'kit', qty: NaN, unitPrice: 5, unitCost: 1 }), line({ kind: 'other', qty: -3, unitPrice: 10, unitCost: -5 })], { hireWeeks: -2 }))
    expect(t.sell).toBe(0)
    expect(t.cost).toBe(0)
    expect(Number.isFinite(t.marginPct)).toBe(true)
  })

  it('supports a discount line and an optional demo deposit', () => {
    const lines = [line({ qty: 1, unitPrice: 1000, unitCost: 0 }), line({ qty: 1, unitPrice: -100, unitCost: 0 })]
    expect(computeQuote(q(lines)).sell).toBe(900)
    const d = computeQuote(q(lines, { depositEnabled: true, depositPct: 25 }))
    expect(d.deposit).toBe(225)
    expect(d.balanceAfterDeposit).toBe(675)
    expect(computeQuote(q(lines, { depositEnabled: true, depositPct: 250 })).deposit).toBe(900) // clamped to 100%
    expect(computeQuote(q(lines, { depositEnabled: false, depositPct: 25 })).deposit).toBe(0)
  })
})

describe('crew formula: people = ceil(person-hours / (days × hours per day))', () => {
  it('rounds up and handles exact fits', () => {
    expect(crewSize(24, 3, 8).people).toBe(1)
    expect(crewSize(25, 3, 8).people).toBe(2)
    expect(crewSize(100, 2, 8).people).toBe(7)
    expect(crewSize(0.1, 1, 8).people).toBe(1)
  })
  it('0 hours needs nobody but is valid', () => {
    expect(crewSize(0, 3, 8)).toEqual({ people: 0, valid: true })
  })
  it('invalid / zero inputs are guarded, not NaN or Infinity', () => {
    for (const [h, d, p] of [[10, 0, 8], [10, 3, 0], [10, -1, 8], [10, 3, -8], [NaN, 3, 8], [10, NaN, 8], [10, 3, Infinity], [-5, 3, 8]] as const) {
      const r = crewSize(h, d, p)
      expect(r.valid).toBe(false)
      expect(r.people).toBe(0)
      expect(r.reason).toBeTruthy()
    }
  })
  it('derives hours from kit lines and builds a labour line', () => {
    const s = buildSeed(new Date('2026-11-05T09:00:00'))
    const job = s.jobs.find((j) => j.kit.length > 20)!
    const quote = s.quotes.find((x) => x.jobId === job.id)!
    const hrs = personHours(quote.lines, s.catalogue)
    expect(hrs).toBeGreaterThan(0)
    const c = quoteCrew(quote, s.catalogue)
    expect(c.people).toBe(Math.ceil(hrs / (quote.crewDays * quote.hoursPerDay)))
    expect(labourLine({ ...quote, crewDays: 0 }, s.catalogue, s.settings)).toBeNull()
    expect(labourLine(quote, s.catalogue, s.settings)!.qty).toBe(c.people * quote.crewDays * quote.hoursPerDay)
    expect(quoteKit(quote).length).toBe(job.kit.length)
  })
})

describe('per-line rental duration', () => {
  it('a kit line can override the quote hire period; other lines ignore it', () => {
    const t = computeQuote(
      q([
        line({ kind: 'kit', qty: 10, unitPrice: 5, unitCost: 1, weeks: 2 }), // 10 × 5 × 2 = 100 / 20
        line({ kind: 'kit', qty: 10, unitPrice: 5, unitCost: 1 }), // falls back to 4 weeks: 200 / 40
        line({ kind: 'transport', qty: 1, unitPrice: 50, unitCost: 30, weeks: 9 }), // weeks ignored
      ]),
    )
    expect(t.sell).toBe(350)
    expect(t.cost).toBe(90)
    expect(lineWeeks(line({ kind: 'kit', weeks: 3 }), 4)).toBe(3)
    expect(lineWeeks(line({ kind: 'kit' }), 4)).toBe(4)
    expect(lineWeeks(line({ kind: 'labour', weeks: 3 }), 4)).toBe(1)
  })
  it('invalid override falls back safely', () => {
    expect(computeQuote(q([line({ kind: 'kit', qty: 1, unitPrice: 10, unitCost: 0, weeks: NaN })])).sell).toBe(40)
    expect(computeQuote(q([line({ kind: 'kit', qty: 1, unitPrice: 10, unitCost: 0, weeks: -3 })])).sell).toBe(0)
  })
})
