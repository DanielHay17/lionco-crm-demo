import { buildChecklist, kitSignature, setLineZone as setZone, toggleTick as tick } from './checklist'
import { monthKey } from './format'
import { nextJobCode } from './jobCodes'
import { computeFinancials, sumCogs, type Financials } from './profit'
import {
  STAGES,
  type ActivityEntry,
  type AppState,
  type ClientType,
  type Expense,
  type ExpenseCategory,
  type Job,
  type KitItem,
  type Stage,
  type Zone,
} from './types'

let counter = 0
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const stageIndex = (s: Stage) => STAGES.indexOf(s)
export const isPaidStage = (s: Stage) => stageIndex(s) >= stageIndex('Paid')
export const isApprovedOrLater = (s: Stage) => stageIndex(s) >= stageIndex('Approved')

export function entry(kind: ActivityEntry['kind'], text: string, at: string): ActivityEntry {
  return { id: newId('act'), at, kind, text }
}

/* ---------- selectors ---------- */

export const jobExpenses = (s: AppState, jobId: string) => s.expenses.filter((e) => e.jobId === jobId)

export function jobFinancials(s: AppState, job: Job): Financials {
  return computeFinancials(job.quote, sumCogs(jobExpenses(s, job.id)))
}

export const findJob = (s: AppState, id: string | undefined) => s.jobs.find((j) => j.id === id)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface MonthPoint {
  key: string
  label: string
  revenue: number
  target: number
}

/** Last N months (oldest→newest, ending with the month of `now`): seeded history + Paid/Review jobs. */
export function monthlyRevenue(s: AppState, now: Date, months = 12): MonthPoint[] {
  const out: MonthPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKey(d)
    const base = s.revenueHistory.find((h) => h.month === key)?.revenue ?? 0
    const fromJobs = s.jobs
      .filter((j) => isPaidStage(j.stage) && j.paidAt && monthKey(new Date(j.paidAt)) === key)
      .reduce((sum, j) => sum + j.quote, 0)
    out.push({
      key,
      label: `${MONTHS[d.getMonth()]}${d.getMonth() === 0 || i === months - 1 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`,
      revenue: base + fromJobs,
      target: s.monthlyTarget,
    })
  }
  return out
}

/* ---------- mutations (pure: state in → state out) ---------- */

function patchJob(s: AppState, jobId: string, fn: (j: Job) => Job): AppState {
  return { ...s, jobs: s.jobs.map((j) => (j.id === jobId ? fn(j) : j)) }
}

/**
 * Single choke-point for every stage change (drag, buttons, stepper).
 * Entering "Approved" auto-generates the packing checklist if none exists yet.
 */
export function moveJob(s: AppState, jobId: string, stage: Stage, at: string): AppState {
  const job = findJob(s, jobId)
  if (!job || job.stage === stage) return s
  const from = job.stage
  let next = patchJob(s, jobId, (j) => {
    const entries = [entry('stage', `Stage changed: ${from} → ${stage}`, at)]
    const paidAt = isPaidStage(stage) ? (isPaidStage(from) && j.paidAt ? j.paidAt : at) : undefined
    return { ...j, stage, paidAt, activity: [...j.activity, ...entries] }
  })
  if (stage === 'Approved' && !next.checklists[jobId]) {
    const updated = findJob(next, jobId)!
    const cl = buildChecklist(updated, next.catalogue, at)
    if (cl) {
      next = { ...next, checklists: { ...next.checklists, [jobId]: cl } }
      next = patchJob(next, jobId, (j) => ({
        ...j,
        activity: [...j.activity, entry('system', `Truck packing checklist generated (${cl.lines.length} lines)`, at)],
      }))
    }
  }
  return next
}

export function stepJob(s: AppState, jobId: string, dir: 1 | -1, at: string): AppState {
  const job = findJob(s, jobId)
  if (!job) return s
  const idx = stageIndex(job.stage) + dir
  if (idx < 0 || idx >= STAGES.length) return s
  return moveJob(s, jobId, STAGES[idx], at)
}

export interface NewJobInput {
  client: string
  clientType: ClientType
  contactName: string
  contactPhone: string
  contactEmail: string
  siteAddress: string
  suburb: string
  quote: number
  notes?: string
}

export const peekNextCode = (s: AppState, now: Date) =>
  nextJobCode(s.jobs.map((j) => j.code), now.getFullYear())

export function addJob(s: AppState, input: NewJobInput, now: Date): { state: AppState; job: Job } {
  const at = now.toISOString()
  const job: Job = {
    id: newId('job'),
    code: peekNextCode(s, now),
    client: input.client.trim(),
    clientType: input.clientType,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    siteAddress: input.siteAddress.trim(),
    suburb: input.suburb.trim(),
    stage: 'Enquiry',
    quote: input.quote,
    kit: [],
    createdAt: at,
    activity: [
      entry('system', 'Enquiry created', at),
      ...(input.notes?.trim() ? [entry('note', input.notes.trim(), at)] : []),
    ],
  }
  return { state: { ...s, jobs: [...s.jobs, job] }, job }
}

export function setQuote(s: AppState, jobId: string, quote: number, at: string): AppState {
  return patchJob(s, jobId, (j) =>
    j.quote === quote ? j : { ...j, quote, activity: [...j.activity, entry('system', `Quote value set to $${quote.toLocaleString('en-AU')}`, at)] },
  )
}

export function setKitQty(s: AppState, jobId: string, itemId: string, qty: number): AppState {
  const q = Math.max(0, Math.floor(qty) || 0)
  return patchJob(s, jobId, (j) => {
    const has = j.kit.some((k) => k.itemId === itemId)
    if (q === 0) return { ...j, kit: j.kit.filter((k) => k.itemId !== itemId) }
    return has
      ? { ...j, kit: j.kit.map((k) => (k.itemId === itemId ? { ...k, qty: q } : k)) }
      : { ...j, kit: [...j.kit, { itemId, qty: q }] }
  })
}

export function addNote(s: AppState, jobId: string, text: string, at: string): AppState {
  if (!text.trim()) return s
  return patchJob(s, jobId, (j) => ({ ...j, activity: [...j.activity, entry('note', text.trim(), at)] }))
}

export interface ExpenseInput {
  jobId: string
  date: string
  supplier: string
  personId: string
  description: string
  category: ExpenseCategory
  reason: string
  amount: number
}

export type ExpenseValidation = Partial<Record<keyof ExpenseInput, string>>

/** Fixed job codes: an expense must reference an existing job id — free text is impossible. */
export function validateExpense(s: AppState, e: Partial<ExpenseInput>): ExpenseValidation {
  const err: ExpenseValidation = {}
  if (!e.jobId || !findJob(s, e.jobId)) err.jobId = 'Choose a job code from the list'
  if (!e.date) err.date = 'Date is required'
  if (!e.supplier?.trim()) err.supplier = 'Where / supplier is required'
  if (!e.personId || !s.people.some((p) => p.id === e.personId)) err.personId = 'Choose who spent it'
  if (!e.description?.trim()) err.description = 'Describe what was bought'
  if (!e.category) err.category = 'Choose a category'
  if (!e.amount || !(e.amount > 0)) err.amount = 'Enter an amount greater than 0'
  return err
}

export function addExpense(s: AppState, input: ExpenseInput, at: string): AppState {
  if (Object.keys(validateExpense(s, input)).length) return s
  const exp: Expense = { id: newId('exp'), ...input, supplier: input.supplier.trim(), description: input.description.trim(), reason: input.reason.trim() }
  const next = { ...s, expenses: [...s.expenses, exp] }
  return patchJob(next, input.jobId, (j) => ({
    ...j,
    activity: [
      ...j.activity,
      entry('system', `Expense logged: $${input.amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })} — ${input.category} (${exp.supplier})`, at),
    ],
  }))
}

export const deleteExpense = (s: AppState, id: string): AppState => ({
  ...s,
  expenses: s.expenses.filter((e) => e.id !== id),
})

export function regenerateChecklist(s: AppState, jobId: string, at: string): AppState {
  const job = findJob(s, jobId)
  if (!job) return s
  const cl = buildChecklist(job, s.catalogue, at)
  const checklists = { ...s.checklists }
  if (cl) checklists[jobId] = cl
  else delete checklists[jobId]
  return patchJob({ ...s, checklists }, jobId, (j) => ({
    ...j,
    activity: [...j.activity, entry('system', cl ? 'Truck packing checklist regenerated from kit list' : 'Packing checklist removed (kit list is empty)', at)],
  }))
}

export function toggleLine(s: AppState, jobId: string, lineId: string): AppState {
  const c = s.checklists[jobId]
  return c ? { ...s, checklists: { ...s.checklists, [jobId]: tick(c, lineId) } } : s
}

export function setLineZone(s: AppState, jobId: string, lineId: string, zone: Zone): AppState {
  const c = s.checklists[jobId]
  return c ? { ...s, checklists: { ...s.checklists, [jobId]: setZone(c, lineId, zone) } } : s
}

export function addCatalogueItem(s: AppState, item: Omit<KitItem, 'id'>): AppState {
  return { ...s, catalogue: [...s.catalogue, { ...item, id: newId('kit') }] }
}

export const checklistIsStale = (s: AppState, job: Job) => {
  const c = s.checklists[job.id]
  return !!c && c.kitSignature !== kitSignature(job.kit)
}

/** Jobs only show profit once work has started (before that there are no meaningful costs). */
export const isCosted = (s: Stage) => stageIndex(s) >= stageIndex('Job in progress')
