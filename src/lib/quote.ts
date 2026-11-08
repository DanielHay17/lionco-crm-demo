import { round2 } from './profit'
import { crewSize, type CrewResult } from './crew'
import type { Job, KitItem, KitLine, Quote, QuoteLine, QuoteLineKind, Settings } from './types'

const num = (n: unknown, fallback = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback)

/** Rental duration multiplier — kit lines are priced per unit per week; everything else is flat. */
const mult = (line: QuoteLine, weeks: number) => (line.kind === 'kit' ? Math.max(0, num(weeks)) : 1)

export const lineSell = (line: QuoteLine, weeks: number) => round2(Math.max(0, num(line.qty)) * num(line.unitPrice) * mult(line, weeks))
export const lineCost = (line: QuoteLine, weeks: number) => round2(Math.max(0, num(line.qty)) * Math.max(0, num(line.unitCost)) * mult(line, weeks))

export interface QuoteTotals {
  /** Sell price / revenue (ex GST). */
  sell: number
  /** Internal expense total (kit handling + labour + transport + other). */
  cost: number
  profit: number
  /** Margin = profit / revenue × 100 (NOT markup). 0 when revenue ≤ 0. */
  marginPct: number
  marginDefined: boolean
  deposit: number
  balanceAfterDeposit: number
  byKind: Record<QuoteLineKind, { sell: number; cost: number }>
}

export function computeQuote(q: Pick<Quote, 'lines' | 'hireWeeks' | 'depositEnabled' | 'depositPct'>): QuoteTotals {
  const byKind: QuoteTotals['byKind'] = { kit: { sell: 0, cost: 0 }, labour: { sell: 0, cost: 0 }, transport: { sell: 0, cost: 0 }, other: { sell: 0, cost: 0 } }
  for (const l of q.lines) {
    byKind[l.kind].sell += lineSell(l, q.hireWeeks)
    byKind[l.kind].cost += lineCost(l, q.hireWeeks)
  }
  for (const k of Object.keys(byKind) as QuoteLineKind[]) {
    byKind[k].sell = round2(byKind[k].sell)
    byKind[k].cost = round2(byKind[k].cost)
  }
  const sell = round2(Object.values(byKind).reduce((s, v) => s + v.sell, 0))
  const cost = round2(Object.values(byKind).reduce((s, v) => s + v.cost, 0))
  const profit = round2(sell - cost)
  const marginDefined = sell > 0
  const pctDep = Math.min(100, Math.max(0, num(q.depositPct)))
  const deposit = q.depositEnabled && sell > 0 ? round2((sell * pctDep) / 100) : 0
  return { sell, cost, profit, marginPct: marginDefined ? (profit / sell) * 100 : 0, marginDefined, deposit, balanceAfterDeposit: round2(Math.max(0, sell - deposit)), byKind }
}

/** Total person-hours implied by the kit lines on a quote (qty × labour hours per unit). */
export function personHours(lines: QuoteLine[], catalogue: KitItem[]): number {
  const by = new Map(catalogue.map((c) => [c.id, c]))
  return round2(lines.filter((l) => l.kind === 'kit' && l.itemId).reduce((s, l) => s + Math.max(0, num(l.qty)) * (by.get(l.itemId!)?.labourHoursPerUnit ?? 0), 0))
}

export function quoteCrew(q: Pick<Quote, 'lines' | 'crewDays' | 'hoursPerDay'>, catalogue: KitItem[]): CrewResult & { totalHours: number } {
  const totalHours = personHours(q.lines, catalogue)
  return { ...crewSize(totalHours, q.crewDays, q.hoursPerDay), totalHours }
}

let lineCounter = 0
export const newLineId = () => `ql-${Date.now().toString(36)}${(lineCounter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function kitLines(kit: KitLine[], catalogue: KitItem[]): QuoteLine[] {
  const by = new Map(catalogue.map((c) => [c.id, c]))
  return kit
    .filter((k) => k.qty > 0 && by.has(k.itemId))
    .map((k) => {
      const it = by.get(k.itemId)!
      return { id: newLineId(), kind: 'kit' as const, description: it.name, itemId: it.id, qty: k.qty, unitPrice: it.weeklyRentalPrice, unitCost: it.weeklyCost }
    })
}

/**
 * Labour line from the crew formula. Crew is paid for full days (people × days × hours/day) — an ASSUMPTION
 * so an under-used last person still costs a day. Returns null when the formula inputs are invalid / nothing to staff.
 */
export function labourLine(
  q: Pick<Quote, 'lines' | 'crewDays' | 'hoursPerDay'>,
  catalogue: KitItem[],
  settings: Pick<Settings, 'labourCostRate' | 'labourChargeRate'>,
): QuoteLine | null {
  const c = quoteCrew(q, catalogue)
  if (!c.valid || c.people === 0) return null
  const hours = c.people * q.crewDays * q.hoursPerDay
  return {
    id: newLineId(),
    kind: 'labour',
    description: `Erect & dismantle crew — ${c.people} ${c.people === 1 ? 'person' : 'people'} × ${q.crewDays} d × ${q.hoursPerDay} h`,
    qty: round2(hours),
    unitPrice: settings.labourChargeRate,
    unitCost: settings.labourCostRate,
  }
}

export function quoteNumber(job: Pick<Job, 'code'>, version: number) {
  return `${job.code}-Q${version}`
}

export const DEFAULT_TERMS =
  'DEMO TEMPLATE TEXT. Prices are in AUD and exclude GST. Hire period as stated; extensions charged weekly at the stated rate. This sample document has no legal standing.'

export function newQuoteDraft(job: Job, version: number, catalogue: KitItem[], settings: Settings, at: string, id: string): Quote {
  const base: Quote = {
    id,
    jobId: job.id,
    number: quoteNumber(job, version),
    version,
    status: 'draft',
    hireWeeks: settings.defaultHireWeeks,
    lines: kitLines(job.kit, catalogue),
    crewDays: settings.defaultCrewDays,
    hoursPerDay: settings.defaultHoursPerDay,
    depositEnabled: false,
    depositPct: settings.defaultDepositPct,
    terms: DEFAULT_TERMS,
    createdAt: at,
  }
  const lab = labourLine(base, catalogue, settings)
  return lab ? { ...base, lines: [...base.lines, lab] } : base
}

/** Aggregated kit (itemId → qty) from the kit lines of a quote. */
export function quoteKit(q: Pick<Quote, 'lines'>): KitLine[] {
  const m = new Map<string, number>()
  for (const l of q.lines) if (l.kind === 'kit' && l.itemId && l.qty > 0) m.set(l.itemId, (m.get(l.itemId) ?? 0) + Math.floor(l.qty))
  return [...m.entries()].map(([itemId, qty]) => ({ itemId, qty }))
}
