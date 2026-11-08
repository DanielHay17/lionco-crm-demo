import { addDays, daysBetween } from './dates'
import { isUpInAir } from './stages'
import type { Job } from './types'

export type InspectionState = 'not-applicable' | 'disabled' | 'ok' | 'due-soon' | 'overdue'

export interface InspectionStatus {
  state: InspectionState
  dueDate?: string
  /** Days until due (negative = days overdue). */
  daysLeft?: number
  basis?: 'erected' | 'last inspection'
  basisDate?: string
}

export const DUE_SOON_DAYS = 7

/**
 * DEMO reminder only — a configurable interval counted from erection (or the last recorded inspection).
 * This is not legal or compliance guidance.
 */
export function inspectionStatus(job: Job, intervalDays: number, today: string): InspectionStatus {
  if (!isUpInAir(job.stage)) return { state: 'not-applicable' }
  if (!Number.isFinite(intervalDays) || intervalDays <= 0) return { state: 'disabled' }
  const last = [...job.inspections].sort((a, b) => b.date.localeCompare(a.date))[0]
  const basisDate = last?.date ?? job.dates.erectedAt
  if (!basisDate) return { state: 'not-applicable' }
  const dueDate = addDays(basisDate, Math.floor(intervalDays))
  const daysLeft = daysBetween(today, dueDate)
  const state: InspectionState = daysLeft < 0 ? 'overdue' : daysLeft <= DUE_SOON_DAYS ? 'due-soon' : 'ok'
  return { state, dueDate, daysLeft, basis: last ? 'last inspection' : 'erected', basisDate }
}
