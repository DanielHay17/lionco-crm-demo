import { dateOnly } from './dates'
import { isBooked } from './clients'
import { round2 } from './profit'
import { regionOf, suburbByName, type AreaFocus, type RegionId } from './sydneyGeo'
import { ymd } from './format'
import type { Job, Stage } from './types'

/** Paid work older than this stays on the map and in client LTV, and out of the live CEO figures. */
export const ARCHIVE_AFTER_DAYS = 400

export const ANALYTICS_STATUSES = [
  { id: 'active', label: 'Active', detail: 'In progress', color: '#172566' },
  { id: 'upcoming', label: 'Upcoming', detail: 'Quoted', color: '#0284c7' },
  { id: 'completed', label: 'Completed', detail: 'Past', color: '#0f766e' },
  { id: 'declined', label: 'Declined', detail: 'Lost', color: '#94a3b8' },
] as const

export type AnalyticsStatus = (typeof ANALYTICS_STATUSES)[number]['id']

export function analyticsStatus(stage: Stage): AnalyticsStatus {
  switch (stage) {
    case 'Enquiry':
    case 'Quote':
    case 'Approved':
      return 'upcoming'
    case 'Job in progress':
    case 'Build booked':
    case 'Erected':
    case 'Takedown booked':
    case 'Dismantled':
    case 'Warehouse return':
      return 'active'
    case 'Invoiced':
    case 'Paid':
    case 'Google review requested':
      return 'completed'
    case 'Declined':
      return 'declined'
    default: {
      const neverStage: never = stage
      return neverStage
    }
  }
}

export function statusColor(status: AnalyticsStatus): string {
  return ANALYTICS_STATUSES.find((s) => s.id === status)!.color
}

/** Historical paid jobs used to fill the Sydney map. Live pipeline and CEO margin ignore these. */
export function isArchivedPaid(job: Job, now: Date): boolean {
  if (!job.paidAt) return false
  return now.getTime() - new Date(job.paidAt).getTime() > ARCHIVE_AFTER_DAYS * 86400000
}

export type DateRangeId = 'this-year' | 'last-12-months' | 'all'

/** Date the job counts on: paid date when it has one, otherwise approval, otherwise the enquiry. */
export function analyticsAnchor(job: Job): string {
  if (job.paidAt) return dateOnly(job.paidAt)
  if (job.dates.approvedAt) return job.dates.approvedAt
  return dateOnly(job.createdAt)
}

export function rangeBounds(range: DateRangeId, now: Date): { from?: string; to: string } {
  const to = ymd(now)
  if (range === 'all') return { to }
  if (range === 'this-year') return { from: `${now.getFullYear()}-01-01`, to }
  const start = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
  return { from: ymd(start), to }
}

export function jobInRange(job: Job, range: DateRangeId, now: Date): boolean {
  const { from, to } = rangeBounds(range, now)
  const d = analyticsAnchor(job)
  if (from && d < from) return false
  if (d > to) return false
  return true
}

export function jobInFocus(job: Job, focus: AreaFocus): boolean {
  if (focus.kind === 'all') return true
  if (focus.kind === 'region') return regionOf(job.suburb) === focus.region
  return job.suburb.trim().toLowerCase() === focus.suburb.trim().toLowerCase()
}

export function filterAnalyticsJobs(jobs: Job[], opts: { statuses: ReadonlySet<AnalyticsStatus>; focus: AreaFocus; range: DateRangeId; now: Date }): Job[] {
  return jobs.filter((j) => opts.statuses.has(analyticsStatus(j.stage)) && jobInFocus(j, opts.focus) && jobInRange(j, opts.range, opts.now))
}

export function statusCounts(jobs: Job[]): Record<AnalyticsStatus, number> {
  const counts: Record<AnalyticsStatus, number> = { active: 0, upcoming: 0, completed: 0, declined: 0 }
  for (const j of jobs) counts[analyticsStatus(j.stage)] += 1
  return counts
}

export interface SuburbStat {
  suburb: string
  region: RegionId | null
  jobs: number
  /** Booked contract value (approved or later). Quotes and declined jobs are not included. */
  revenue: number
  /** Revenue ÷ booked jobs. 0 when the suburb has no booked work. */
  average: number
  booked: number
  lat: number | null
  lng: number | null
}

/** Revenue, job count and average value per suburb. Revenue matches client booked LTV (approved or later). */
export function suburbStats(jobs: Job[]): SuburbStat[] {
  const grouped = new Map<string, { jobs: number; revenue: number; booked: number }>()
  for (const j of jobs) {
    const row = grouped.get(j.suburb) ?? { jobs: 0, revenue: 0, booked: 0 }
    row.jobs += 1
    if (isBooked(j)) {
      row.revenue = round2(row.revenue + j.quote)
      row.booked += 1
    }
    grouped.set(j.suburb, row)
  }
  return [...grouped.entries()]
    .map(([suburb, row]) => {
      const centre = suburbByName(suburb)
      return {
        suburb,
        region: regionOf(suburb),
        jobs: row.jobs,
        revenue: row.revenue,
        average: row.booked ? round2(row.revenue / row.booked) : 0,
        booked: row.booked,
        lat: centre?.lat ?? null,
        lng: centre?.lng ?? null,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || a.suburb.localeCompare(b.suburb))
}

export type SuburbSortKey = 'suburb' | 'jobs' | 'revenue' | 'average'

export function sortSuburbRows(rows: SuburbStat[], key: SuburbSortKey, dir: 1 | -1): SuburbStat[] {
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av < bv) return -dir
    if (av > bv) return dir
    return a.suburb.localeCompare(b.suburb)
  })
}

export interface AreaKpis {
  revenue: number
  activeJobs: number
  pastJobs: number
  topSuburb: string | null
  topSuburbRevenue: number
  averageJobValue: number
  bookedJobs: number
  jobCount: number
}

export function areaKpis(jobs: Job[]): AreaKpis {
  const rows = suburbStats(jobs)
  const counts = statusCounts(jobs)
  const revenue = round2(rows.reduce((sum, row) => sum + row.revenue, 0))
  const bookedJobs = rows.reduce((sum, row) => sum + row.booked, 0)
  const top = rows.find((row) => row.revenue > 0) ?? null
  return {
    revenue,
    activeJobs: counts.active,
    pastJobs: counts.completed,
    topSuburb: top?.suburb ?? null,
    topSuburbRevenue: top?.revenue ?? 0,
    averageJobValue: bookedJobs ? round2(revenue / bookedJobs) : 0,
    bookedJobs,
    jobCount: jobs.length,
  }
}

/** Pixel radius for a suburb revenue bubble. Square-root scale so one big suburb does not hide the rest. */
export function bubbleRadiusPx(revenue: number, maxRevenue: number): number {
  if (revenue <= 0 || maxRevenue <= 0) return 0
  const t = Math.sqrt(Math.min(1, revenue / maxRevenue))
  return Math.round((12 + t * 28) * 10) / 10
}
