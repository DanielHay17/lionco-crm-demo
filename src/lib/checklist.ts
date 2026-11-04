import { autoAssign, computeBalance, type Balance } from './loadBalance'
import type { Checklist, ChecklistLine, Job, KitItem, KitLine, Zone } from './types'

export function kitSignature(kit: KitLine[]): string {
  return [...kit]
    .filter((k) => k.qty > 0)
    .sort((a, b) => a.itemId.localeCompare(b.itemId))
    .map((k) => `${k.itemId}:${k.qty}`)
    .join(',')
}

/** Build a fresh packing checklist (all unticked, zones auto-balanced) from a job's kit list. */
export function buildChecklist(job: Job, catalogue: KitItem[], at: string): Checklist | null {
  const byId = new Map(catalogue.map((c) => [c.id, c]))
  const usable = job.kit.filter((k) => k.qty > 0 && byId.has(k.itemId))
  if (usable.length === 0) return null
  const assigned = autoAssign(
    usable.map((k) => ({ key: k.itemId, qty: k.qty, unitWeightKg: byId.get(k.itemId)!.unitWeightKg })),
  )
  const lines: ChecklistLine[] = assigned.map((a) => {
    const item = byId.get(a.key)!
    return {
      id: `${a.key}-${a.zone}`,
      itemId: a.key,
      name: item.name,
      qty: a.qty,
      unitWeightKg: item.unitWeightKg,
      zone: a.zone,
      ticked: false,
    }
  })
  return { jobId: job.id, generatedAt: at, kitSignature: kitSignature(job.kit), lines }
}

export function checklistBalance(c: Checklist): Balance {
  return computeBalance(c.lines)
}

export function checklistProgress(c: Checklist): { done: number; total: number } {
  return { done: c.lines.filter((l) => l.ticked).length, total: c.lines.length }
}

/** Move a line to another zone, merging with an existing line of the same item+zone. */
export function setLineZone(c: Checklist, lineId: string, zone: Zone): Checklist {
  const line = c.lines.find((l) => l.id === lineId)
  if (!line || line.zone === zone) return c
  const target = c.lines.find((l) => l.itemId === line.itemId && l.zone === zone)
  let lines: ChecklistLine[]
  if (target) {
    lines = c.lines
      .filter((l) => l.id !== lineId)
      .map((l) =>
        l.id === target.id ? { ...l, qty: l.qty + line.qty, ticked: l.ticked && line.ticked } : l,
      )
  } else {
    lines = c.lines.map((l) => (l.id === lineId ? { ...l, zone, id: `${l.itemId}-${zone}` } : l))
  }
  return { ...c, lines }
}

export function toggleTick(c: Checklist, lineId: string): Checklist {
  return { ...c, lines: c.lines.map((l) => (l.id === lineId ? { ...l, ticked: !l.ticked } : l)) }
}
