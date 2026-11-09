import { isApprovedOrLater, isPaidStage } from './stages'
import { round2 } from './profit'
import type { AppState, Client, Job } from './types'

export const clientJobs = (s: AppState, clientId: string) => s.jobs.filter((j) => j.clientId === clientId)

export function activeQuoteOf(s: AppState, job: Job) {
  return s.quotes.find((q) => q.id === job.activeQuoteId)
}

/** Value counted as "booked": approved-or-later jobs (declined jobs and anything not yet approved are excluded). */
export const isBooked = (j: Job) => j.stage !== 'Declined' && isApprovedOrLater(j.stage)

/**
 * "Quoted" (open pipeline) treatment: the job sits at the Quote stage AND its active quote has been issued.
 * Draft quotes, enquiries, declined quotes are excluded. Legacy jobs with no quote object count by stage.
 */
export function isQuotedOpen(s: AppState, j: Job): boolean {
  if (j.stage !== 'Quote') return false
  const q = activeQuoteOf(s, j)
  return q ? q.status === 'issued' : true
}

export interface ClientMetrics {
  /** Lifetime value, booked basis: Σ contract value of approved-or-later jobs. */
  bookedLtv: number
  /** Lifetime value, paid basis: Σ contract value of jobs at Paid or later. */
  paidLtv: number
  bookedCount: number
  /** bookedLtv / bookedCount (0 when the client has no booked jobs). */
  avgTicket: number
  /** Issued quotes still open — shown separately and NOT part of LTV. */
  quotedOpen: number
  declinedCount: number
  current: Job[]
  past: Job[]
}

export function clientMetrics(s: AppState, clientId: string): ClientMetrics {
  const jobs = clientJobs(s, clientId)
  const booked = jobs.filter(isBooked)
  const bookedLtv = round2(booked.reduce((a, j) => a + j.quote, 0))
  const paidLtv = round2(jobs.filter((j) => isPaidStage(j.stage)).reduce((a, j) => a + j.quote, 0))
  const quotedOpen = round2(jobs.filter((j) => isQuotedOpen(s, j)).reduce((a, j) => a + j.quote, 0))
  const done = (j: Job) => j.stage === 'Declined' || isPaidStage(j.stage)
  return {
    bookedLtv,
    paidLtv,
    bookedCount: booked.length,
    avgTicket: booked.length ? round2(bookedLtv / booked.length) : 0,
    quotedOpen,
    declinedCount: jobs.filter((j) => j.stage === 'Declined').length,
    current: jobs.filter((j) => !done(j)),
    past: jobs.filter(done),
  }
}

export const findClient = (s: AppState, id: string | undefined): Client | undefined => s.clients.find((c) => c.id === id)

export const contactOf = (c: Client | undefined, id: string | undefined) => c?.contacts.find((x) => x.id === id)
