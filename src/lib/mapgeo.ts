import { dateOnly } from './dates'
import { mapGroupOf, type MapGroup } from './stages'
import type { Job } from './types'

/**
 * ILLUSTRATIVE schematic positions (0–100 grid, north up). Roughly Sydney-shaped but NOT to scale and not a real map —
 * no map tokens or tile services are used.
 */
export const SUBURB_POS: Record<string, [number, number]> = {
  penrith: [8, 46],
  parramatta: [36, 40],
  blacktown: [26, 28],
  hornsby: [50, 10],
  chatswood: [62, 26],
  manly: [82, 18],
  marrickville: [57, 56],
  newtown: [60, 50],
  bondi: [82, 50],
  randwick: [74, 60],
  bankstown: [44, 64],
  liverpool: [28, 72],
  cronulla: [70, 88],
  'sydney cbd': [68, 44],
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface MapPoint {
  x: number
  y: number
  /** true when the suburb has no schematic position (placed in the "unplaced" strip). */
  unplaced: boolean
}

/** Deterministic position; a small per-job offset keeps bubbles in one suburb from stacking exactly. */
export function jobPoint(job: Pick<Job, 'id' | 'suburb'>): MapPoint {
  const base = SUBURB_POS[job.suburb.trim().toLowerCase()]
  const h = hash(job.id)
  const dx = ((h % 1000) / 1000 - 0.5) * 6
  const dy = (((h >>> 10) % 1000) / 1000 - 0.5) * 6
  if (base) return { x: base[0] + dx, y: base[1] + dy, unplaced: false }
  return { x: 6 + ((h % 1000) / 1000) * 30, y: 92 + (((h >>> 10) % 1000) / 1000) * 4, unplaced: true }
}

export interface MapFilter {
  groups: Set<MapGroup>
  suburb: string
  from?: string // YYYY-MM-DD on createdAt
  to?: string
  clientId?: string
}

export function filterMapJobs(jobs: Job[], f: MapFilter): Job[] {
  return jobs.filter((j) => {
    if (!f.groups.has(mapGroupOf(j.stage))) return false
    if (f.suburb && j.suburb !== f.suburb) return false
    if (f.clientId && j.clientId !== f.clientId) return false
    const d = dateOnly(j.createdAt)
    if (f.from && d < f.from) return false
    if (f.to && d > f.to) return false
    return true
  })
}
