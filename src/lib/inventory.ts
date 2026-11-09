import { isKitReserved } from './stages'
import type { AppState, KitItem, KitLine } from './types'

/** Units committed to jobs from Approved until the kit is back and unpacked (Warehouse return stage inclusive). */
export function reservedByItem(s: AppState, excludeJobId?: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const j of s.jobs) {
    if (j.id === excludeJobId || !isKitReserved(j.stage)) continue
    for (const k of j.kit) m.set(k.itemId, (m.get(k.itemId) ?? 0) + Math.max(0, k.qty))
  }
  return m
}

export interface StockRow {
  item: KitItem
  owned: number
  reserved: number
  /** owned − reserved (negative = over-committed). */
  available: number
  shortage: number
}

export function stockRows(s: AppState): StockRow[] {
  const res = reservedByItem(s)
  return s.catalogue.map((item) => {
    const owned = Math.max(0, item.ownedQty)
    const reserved = res.get(item.id) ?? 0
    return { item, owned, reserved, available: owned - reserved, shortage: Math.max(0, reserved - owned) }
  })
}

export interface Shortage {
  itemId: string
  name: string
  need: number
  availableToThisJob: number
  short: number
}

/** Shortages if `kit` were committed for a job, given what OTHER jobs have reserved. */
export function kitShortages(s: AppState, kit: KitLine[], jobId?: string): Shortage[] {
  const res = reservedByItem(s, jobId)
  const by = new Map(s.catalogue.map((c) => [c.id, c]))
  const out: Shortage[] = []
  for (const k of kit) {
    const item = by.get(k.itemId)
    if (!item || k.qty <= 0) continue
    const availableToThisJob = Math.max(0, item.ownedQty) - (res.get(k.itemId) ?? 0)
    if (k.qty > availableToThisJob) out.push({ itemId: k.itemId, name: item.name, need: k.qty, availableToThisJob, short: k.qty - Math.max(0, availableToThisJob) })
  }
  return out
}
