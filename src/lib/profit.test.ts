import { describe, expect, it } from 'vitest'
import { computeFinancials, marginStatus, sumCogs } from './profit'

describe('profit', () => {
  it('sums expenses as COGS', () => {
    expect(sumCogs([{ amount: 100.1 }, { amount: 200.2 }])).toBe(300.3)
    expect(sumCogs([])).toBe(0)
  })

  it('computes profit and margin', () => {
    const f = computeFinancials(10000, 7500)
    expect(f.profit).toBe(2500)
    expect(f.marginPct).toBe(25)
  })

  it('handles a loss', () => {
    const f = computeFinancials(10000, 12500)
    expect(f.profit).toBe(-2500)
    expect(f.marginPct).toBe(-25)
    expect(marginStatus(f)).toBe('loss')
  })

  it('handles a zero quote without NaN/Infinity', () => {
    const f = computeFinancials(0, 0)
    expect(f.profit).toBe(0)
    expect(f.marginPct).toBe(0)
    const g = computeFinancials(0, 500)
    expect(g.marginPct).toBe(0)
    expect(g.profit).toBe(-500)
    expect(marginStatus(g)).toBe('loss')
  })

  it('classifies healthy / thin / loss', () => {
    expect(marginStatus(computeFinancials(1000, 700))).toBe('healthy')
    expect(marginStatus(computeFinancials(1000, 800))).toBe('healthy') // exactly 20%
    expect(marginStatus(computeFinancials(1000, 900))).toBe('thin')
    expect(marginStatus(computeFinancials(1000, 1000))).toBe('thin')
    expect(marginStatus(computeFinancials(1000, 1001))).toBe('loss')
  })
})
