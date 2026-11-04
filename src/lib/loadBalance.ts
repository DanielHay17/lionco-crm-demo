import { ZONES, type Zone } from './types'

/** Either side carrying more than this share of the load is flagged (60/40 rule). */
export const MAX_SIDE_PCT = 60

export interface WeightedLine {
  unitWeightKg: number
  qty: number
  zone: Zone
}

export interface Balance {
  totalKg: number
  zoneKg: Record<Zone, number>
  frontPct: number
  rearPct: number
  leftPct: number
  rightPct: number
  frontRearOk: boolean
  leftRightOk: boolean
  status: 'empty' | 'ok' | 'warning'
  warnings: string[]
}

export const lineWeight = (unitWeightKg: number, qty: number) => unitWeightKg * qty

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 10000) / 100 : 0)

export function computeBalance(lines: WeightedLine[]): Balance {
  const zoneKg: Record<Zone, number> = { FL: 0, FR: 0, RL: 0, RR: 0 }
  for (const l of lines) zoneKg[l.zone] += lineWeight(l.unitWeightKg, l.qty)
  const totalKg = zoneKg.FL + zoneKg.FR + zoneKg.RL + zoneKg.RR
  const frontPct = pct(zoneKg.FL + zoneKg.FR, totalKg)
  const rearPct = pct(zoneKg.RL + zoneKg.RR, totalKg)
  const leftPct = pct(zoneKg.FL + zoneKg.RL, totalKg)
  const rightPct = pct(zoneKg.FR + zoneKg.RR, totalKg)
  const frontRearOk = Math.max(frontPct, rearPct) <= MAX_SIDE_PCT
  const leftRightOk = Math.max(leftPct, rightPct) <= MAX_SIDE_PCT
  const warnings: string[] = []
  if (!frontRearOk) {
    warnings.push(
      `${frontPct > rearPct ? 'Front' : 'Rear'}-heavy: ${Math.max(frontPct, rearPct).toFixed(0)}% of the load is on the ${
        frontPct > rearPct ? 'front' : 'rear'
      } half (limit ${MAX_SIDE_PCT}/${100 - MAX_SIDE_PCT}).`,
    )
  }
  if (!leftRightOk) {
    warnings.push(
      `${leftPct > rightPct ? 'Left' : 'Right'}-heavy: ${Math.max(leftPct, rightPct).toFixed(0)}% of the load is on the ${
        leftPct > rightPct ? 'left' : 'right'
      } side (limit ${MAX_SIDE_PCT}/${100 - MAX_SIDE_PCT}).`,
    )
  }
  const status = totalKg === 0 ? 'empty' : warnings.length ? 'warning' : 'ok'
  return { totalKg, zoneKg, frontPct, rearPct, leftPct, rightPct, frontRearOk, leftRightOk, status, warnings }
}

export interface AssignInput {
  key: string
  unitWeightKg: number
  qty: number
}
export interface AssignOutput {
  key: string
  qty: number
  zone: Zone
}

/**
 * Greedy balancing: big lines are split into pieces (≤ 1/8 of total load, min 1 unit),
 * pieces are placed heaviest-first into the currently lightest zone, then pieces of
 * the same item landing in the same zone are merged back into one line.
 * Deterministic (ties resolved in FL, FR, RL, RR order).
 */
export function autoAssign(items: AssignInput[]): AssignOutput[] {
  const live = items.filter((i) => i.qty > 0)
  const total = live.reduce((s, i) => s + i.unitWeightKg * i.qty, 0)
  const cap = total / 8

  interface Piece {
    key: string
    qty: number
    weight: number
    order: number
  }
  const pieces: Piece[] = []
  live.forEach((item, order) => {
    const per = item.unitWeightKg > 0 ? Math.max(1, Math.floor(cap / item.unitWeightKg)) : item.qty
    for (let left = item.qty; left > 0; left -= per) {
      const q = Math.min(per, left)
      pieces.push({ key: item.key, qty: q, weight: q * item.unitWeightKg, order })
    }
  })
  pieces.sort((a, b) => b.weight - a.weight || a.order - b.order)

  const load: Record<Zone, number> = { FL: 0, FR: 0, RL: 0, RR: 0 }
  const merged = new Map<string, AssignOutput & { order: number }>()
  for (const p of pieces) {
    let zone: Zone = ZONES[0]
    for (const z of ZONES) if (load[z] < load[zone]) zone = z
    load[zone] += p.weight
    const k = `${p.key}|${zone}`
    const existing = merged.get(k)
    if (existing) existing.qty += p.qty
    else merged.set(k, { key: p.key, qty: p.qty, zone, order: p.order })
  }
  return [...merged.values()]
    .sort((a, b) => a.order - b.order || ZONES.indexOf(a.zone) - ZONES.indexOf(b.zone))
    .map(({ key, qty, zone }) => ({ key, qty, zone }))
}
