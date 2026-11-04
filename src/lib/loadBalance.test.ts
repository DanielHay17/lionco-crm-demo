import { describe, expect, it } from 'vitest'
import { autoAssign, computeBalance, MAX_SIDE_PCT } from './loadBalance'

const L = (unitWeightKg: number, qty: number, zone: 'FL' | 'FR' | 'RL' | 'RR') => ({ unitWeightKg, qty, zone })

describe('computeBalance', () => {
  it('totals each zone and the whole load', () => {
    const b = computeBalance([L(10, 2, 'FL'), L(5, 4, 'FR'), L(20, 1, 'RL'), L(2.5, 4, 'RR')])
    expect(b.zoneKg).toEqual({ FL: 20, FR: 20, RL: 20, RR: 10 })
    expect(b.totalKg).toBe(70)
  })

  it('computes front/rear and left/right percentages', () => {
    const b = computeBalance([L(10, 3, 'FL'), L(10, 1, 'FR'), L(10, 3, 'RL'), L(10, 3, 'RR')])
    expect(b.frontPct).toBe(40)
    expect(b.rearPct).toBe(60)
    expect(b.leftPct).toBe(60)
    expect(b.rightPct).toBe(40)
  })

  it('treats exactly 60/40 as acceptable', () => {
    const b = computeBalance([L(10, 3, 'FL'), L(10, 3, 'FR'), L(10, 2, 'RL'), L(10, 2, 'RR')])
    expect(b.frontPct).toBe(60)
    expect(b.frontRearOk).toBe(true)
    expect(b.status).toBe('ok')
  })

  it('flags front/rear worse than 60/40', () => {
    const b = computeBalance([L(10, 4, 'FL'), L(10, 3, 'FR'), L(10, 1, 'RL'), L(10, 2, 'RR')])
    expect(b.frontPct).toBe(70)
    expect(b.frontRearOk).toBe(false)
    expect(b.leftRightOk).toBe(true)
    expect(b.status).toBe('warning')
    expect(b.warnings[0]).toMatch(/Front-heavy/)
  })

  it('flags left/right worse than 60/40', () => {
    const b = computeBalance([L(10, 4, 'FL'), L(10, 1, 'FR'), L(10, 4, 'RL'), L(10, 1, 'RR')])
    expect(b.leftPct).toBe(80)
    expect(b.leftRightOk).toBe(false)
    expect(b.frontRearOk).toBe(true)
    expect(b.warnings[0]).toMatch(/Left-heavy/)
  })

  it('handles an empty list without NaN', () => {
    const b = computeBalance([])
    expect(b.totalKg).toBe(0)
    expect(b.frontPct).toBe(0)
    expect(b.leftPct).toBe(0)
    expect(b.status).toBe('empty')
    expect(b.warnings).toEqual([])
  })

  it('uses a 60% limit', () => {
    expect(MAX_SIDE_PCT).toBe(60)
  })
})

describe('autoAssign', () => {
  const weightOf = (items: { key: string; unitWeightKg: number }[], out: ReturnType<typeof autoAssign>) =>
    out.map((o) => ({ unitWeightKg: items.find((i) => i.key === o.key)!.unitWeightKg, qty: o.qty, zone: o.zone }))

  it('returns nothing for an empty list', () => {
    expect(autoAssign([])).toEqual([])
    expect(autoAssign([{ key: 'a', unitWeightKg: 5, qty: 0 }])).toEqual([])
  })

  it('preserves quantities per item', () => {
    const items = [
      { key: 'a', unitWeightKg: 17, qty: 23 },
      { key: 'b', unitWeightKg: 1, qty: 61 },
      { key: 'c', unitWeightKg: 20, qty: 1 },
    ]
    const out = autoAssign(items)
    for (const i of items) expect(out.filter((o) => o.key === i.key).reduce((s, o) => s + o.qty, 0)).toBe(i.qty)
  })

  it('balances a realistic kit to well within 60/40', () => {
    const items = [
      { key: 'std', unitWeightKg: 17, qty: 12 },
      { key: 'led', unitWeightKg: 10, qty: 26 },
      { key: 'plank', unitWeightKg: 17, qty: 36 },
      { key: 'cpl', unitWeightKg: 1, qty: 90 },
      { key: 'bay', unitWeightKg: 20, qty: 2 },
    ]
    const b = computeBalance(weightOf(items, autoAssign(items)))
    expect(b.status).toBe('ok')
    expect(Math.abs(b.frontPct - 50)).toBeLessThan(5)
    expect(Math.abs(b.leftPct - 50)).toBeLessThan(5)
  })

  it('splits a single heavy line across zones', () => {
    const items = [{ key: 'plank', unitWeightKg: 17, qty: 40 }]
    const out = autoAssign(items)
    expect(new Set(out.map((o) => o.zone)).size).toBe(4)
    expect(computeBalance(weightOf(items, out)).status).toBe('ok')
  })

  it('is deterministic', () => {
    const items = [
      { key: 'a', unitWeightKg: 3, qty: 7 },
      { key: 'b', unitWeightKg: 9, qty: 4 },
    ]
    expect(autoAssign(items)).toEqual(autoAssign(items))
  })

  it('handles zero-weight items', () => {
    const out = autoAssign([{ key: 'z', unitWeightKg: 0, qty: 5 }])
    expect(out.reduce((s, o) => s + o.qty, 0)).toBe(5)
  })
})
