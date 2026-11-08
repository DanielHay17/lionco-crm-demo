import { dateOnly } from './dates'
import { isBooked } from './clients'
import { round2 } from './profit'
import { isPaidStage } from './stages'
import type { AppState, Job } from './types'

export interface SuburbRow {
  suburb: string
  jobs: number
  revenue: number
}

/** Date a job counts as booked (approval date if known, else creation). */
export const bookedDate = (j: Job) => j.dates.approvedAt ?? dateOnly(j.createdAt)
export const paidDate = (j: Job) => j.paidAt ? dateOnly(j.paidAt) : undefined

/**
 * Light demo analytics: revenue by suburb. basis 'booked' = approved-or-later contract value by approval date;
 * basis 'paid' = paid jobs by paid date. Optional inclusive from/to (YYYY-MM-DD).
 */
export function suburbRevenue(s: AppState, opts: { basis: 'booked' | 'paid'; from?: string; to?: string }): SuburbRow[] {
  const m = new Map<string, SuburbRow>()
  for (const j of s.jobs) {
    const ok = opts.basis === 'booked' ? isBooked(j) : isPaidStage(j.stage)
    if (!ok) continue
    const d = opts.basis === 'booked' ? bookedDate(j) : paidDate(j)
    if (!d) continue
    if (opts.from && d < opts.from) continue
    if (opts.to && d > opts.to) continue
    const r = m.get(j.suburb) ?? { suburb: j.suburb, jobs: 0, revenue: 0 }
    r.jobs += 1
    r.revenue = round2(r.revenue + j.quote)
    m.set(j.suburb, r)
  }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue)
}
