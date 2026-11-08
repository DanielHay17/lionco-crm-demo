import { buildChecklist, kitSignature, setLineZone as setZone, toggleTick as tick } from './checklist'
import { addDays, dateOnly } from './dates'
import { monthKey } from './format'
import { formatJobCode, parseJobCode } from './jobCodes'
import { computeFinancials, sumCogs, type Financials } from './profit'
import { computeQuote, newQuoteDraft, quoteKit } from './quote'
import {
  atOrAfter,
  canMove,
  isApprovedOrLater,
  isCosted,
  isPaidStage,
  neighbourStage,
  stageIndex,
} from './stages'
import {
  type ActivityEntry,
  type AppState,
  type Client,
  type ClientType,
  type Expense,
  type ExpenseCategory,
  type Job,
  type JobDates,
  type KitItem,
  type KitLine,
  type Quote,
  type QuoteStatus,
  type ServiceType,
  type Stage,
  type SyncItem,
  type SyncKind,
  type Variation,
  type Zone,
} from './types'

export { isApprovedOrLater, isCosted, isPaidStage, stageIndex }

let counter = 0
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function entry(kind: ActivityEntry['kind'], text: string, at: string): ActivityEntry {
  return { id: newId('act'), at, kind, text }
}

/* ---------- selectors ---------- */

export const jobExpenses = (s: AppState, jobId: string) => s.expenses.filter((e) => e.jobId === jobId)

export function jobFinancials(s: AppState, job: Job): Financials {
  return computeFinancials(job.quote, sumCogs(jobExpenses(s, job.id)))
}

export const findJob = (s: AppState, id: string | undefined) => s.jobs.find((j) => j.id === id)
export const findQuote = (s: AppState, id: string | undefined) => s.quotes.find((q) => q.id === id)
export const jobQuotes = (s: AppState, jobId: string) => s.quotes.filter((q) => q.jobId === jobId).sort((a, b) => b.version - a.version)
export const activeQuote = (s: AppState, job: Job) => findQuote(s, job.activeQuoteId)
export const jobVariations = (s: AppState, jobId: string) => s.variations.filter((v) => v.jobId === jobId)

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
const patchQuote = (s: AppState, quoteId: string, fn: (q: Quote) => Quote): AppState => ({
  ...s,
  quotes: s.quotes.map((q) => (q.id === quoteId ? fn(q) : q)),
})
const log = (s: AppState, jobId: string, kind: ActivityEntry['kind'], text: string, at: string) =>
  patchJob(s, jobId, (j) => ({ ...j, activity: [...j.activity, entry(kind, text, at)] }))

/** Local mock-Xero queue entry (nothing leaves the browser). */
export function enqueueSync(s: AppState, kind: SyncKind, job: Job, summary: string, amount: number, at: string): AppState {
  const item: SyncItem = { id: newId('sync'), kind, jobId: job.id, summary, amount, status: 'queued', createdAt: at, updatedAt: at }
  return { ...s, syncQueue: [item, ...s.syncQueue] }
}

/** Which job-date each stage stamps, and the main-path stage it belongs to. */
const STAGE_DATE: [Stage, keyof JobDates][] = [
  ['Approved', 'approvedAt'],
  ['Build booked', 'buildDate'],
  ['Erected', 'erectedAt'],
  ['Takedown booked', 'takedownDate'],
  ['Dismantled', 'dismantledAt'],
  ['Warehouse return', 'returnedAt'],
  ['Invoiced', 'invoicedAt'],
]
const BOOKED_STAGES: Stage[] = ['Build booked', 'Takedown booked']

/** Stamp the date for the entered stage and clear dates that belong to later stages (so dates never contradict the stage). */
export function datesForStage(dates: JobDates, stage: Stage, at: string): JobDates {
  const today = dateOnly(at)
  const next: JobDates = { ...dates }
  const idx = stageIndex(stage)
  for (const [st, field] of STAGE_DATE) {
    if (st === stage) {
      // returnedAt is only set when the return checklist is completed, never by simply entering the stage
      if (field !== 'returnedAt' && !next[field]) next[field] = BOOKED_STAGES.includes(st) ? addDays(today, 7) : today
    } else if (stageIndex(st) > idx) delete next[field]
  }
  return next
}

/** Keep the active quote's status coherent with the job stage (see invariants in docs/CALL_FEATURES.md). */
function quoteStatusFor(stage: Stage): QuoteStatus {
  if (stage === 'Enquiry') return 'draft'
  if (stage === 'Quote') return 'issued'
  if (stage === 'Declined') return 'declined'
  return 'approved'
}

export function jobValueFromQuote(s: AppState, quote: Quote): number {
  const base = computeQuote(quote).sell
  if (quote.status !== 'approved') return base
  const extra = s.variations.filter((v) => v.jobId === quote.jobId && v.status === 'approved').reduce((a, v) => a + v.sellDelta, 0)
  return Math.round((base + extra) * 100) / 100
}

function syncJobValue(s: AppState, jobId: string): AppState {
  const job = findJob(s, jobId)
  const q = job && activeQuote(s, job)
  if (!job || !q || q.lines.length === 0) return s
  const v = jobValueFromQuote(s, q)
  return job.quote === v ? s : patchJob(s, jobId, (j) => ({ ...j, quote: v }))
}

function setStage(s: AppState, jobId: string, stage: Stage, at: string, reason?: string): AppState {
  const job = findJob(s, jobId)
  if (!job || job.stage === stage) return s
  const from = job.stage
  let next = patchJob(s, jobId, (j) => {
    const paidAt = isPaidStage(stage) ? (isPaidStage(from) && j.paidAt ? j.paidAt : at) : undefined
    const entries = [entry('stage', `Stage changed: ${from} → ${stage}`, at)]
    if (stage === 'Declined') entries.push(entry('note', `Declined: ${reason || 'no reason recorded'}`, at))
    return {
      ...j,
      stage,
      paidAt,
      dates: datesForStage(j.dates, stage, at),
      declinedReason: stage === 'Declined' ? reason || 'No reason recorded' : undefined,
      activity: [...j.activity, ...entries],
    }
  })
  if (stage === 'Approved' && !next.checklists[jobId]) {
    const updated = findJob(next, jobId)!
    const cl = buildChecklist(updated, next.catalogue, at)
    if (cl) {
      next = { ...next, checklists: { ...next.checklists, [jobId]: cl } }
      next = log(next, jobId, 'system', `Truck packing checklist generated (${cl.lines.length} lines)`, at)
    }
  }
  if (stage === 'Invoiced' && !next.syncQueue.some((x) => x.jobId === jobId && x.kind === 'invoice-draft' && x.status !== 'declined')) {
    const j = findJob(next, jobId)!
    next = enqueueSync(next, 'invoice-draft', j, `Invoice draft for ${j.code} (mock — nothing sent to Xero)`, j.quote, at)
  }
  return next
}

/**
 * Single choke-point for every stage change (drag, buttons, stepper, quote actions).
 * Also keeps the active quote, kit, job value and checklist coherent with the stage.
 */
export function moveJob(s: AppState, jobId: string, stage: Stage, at: string, reason?: string): AppState {
  const job = findJob(s, jobId)
  if (!job || !canMove(job.stage, stage)) return s
  let next = s
  const q = activeQuote(next, job)
  if (q) {
    const want = quoteStatusFor(stage)
    if (q.status !== want) {
      const wasApproved = q.status === 'approved'
      next = patchQuote(next, q.id, (x) => ({
        ...x,
        status: want,
        issuedAt: want === 'issued' ? at : x.issuedAt,
        decidedAt: want === 'approved' || want === 'declined' ? at : undefined,
        declineReason: want === 'declined' ? reason || 'No reason recorded' : undefined,
      }))
      const nq = findQuote(next, q.id)!
      if (want === 'approved' && !wasApproved) {
        const kit = quoteKit(nq)
        next = patchJob(next, jobId, (j) => ({ ...j, kit: kit.length ? kit : j.kit }))
        next = log(next, jobId, 'system', `Quote ${nq.number} approved (simulated) — kit list set from the quote`, at)
      } else if (want === 'issued') {
        next = log(next, jobId, 'system', `Quote ${nq.number} issued (simulated — no email sent)`, at)
        next = enqueueSync(next, 'quote-sync', findJob(next, jobId)!, `Quote ${nq.number} to CRM/Xero (mock)`, computeQuote(nq).sell, at)
      } else if (want === 'declined') next = log(next, jobId, 'system', `Quote ${nq.number} declined`, at)
      next = syncJobValue(next, jobId)
    }
  }
  return setStage(next, jobId, stage, at, reason)
}

export function stepJob(s: AppState, jobId: string, dir: 1 | -1, at: string): AppState {
  const job = findJob(s, jobId)
  const target = job && neighbourStage(job.stage, dir)
  return job && target ? moveJob(s, jobId, target, at) : s
}

/** Advisory (non-blocking) warnings shown when a move skips operational steps. */
export function stageWarnings(s: AppState, job: Job, to: Stage): string[] {
  const w: string[] = []
  if (to === 'Declined' || stageIndex(to) <= stageIndex(job.stage)) return w
  if (atOrAfter(to, 'Approved') && !activeQuote(s, job) && job.stage !== 'Approved') w.push('No quote has been built for this job yet')
  if (atOrAfter(to, 'Erected') && !s.checklists[job.id]) w.push('No packing checklist exists — kit list may be empty')
  if (atOrAfter(to, 'Invoiced') && stageIndex(job.stage) < stageIndex('Warehouse return') ) w.push('Kit has not been returned to the warehouse yet')
  const cl = s.checklists[job.id]
  if (cl && atOrAfter(to, 'Dismantled') && stageIndex(job.stage) < stageIndex('Dismantled') && !cl.lines.every((l) => l.ticked)) w.push('Packing checklist is not fully ticked')
  if (atOrAfter(to, 'Invoiced') && cl && !returnComplete(cl)) w.push('Warehouse return checklist is not complete')
  return w
}

/* ---------- numbering & clients ---------- */

export const nextJobSeq = (s: AppState) => Math.max(s.jobCounter, ...s.jobs.map((j) => j.seq + 1), 1)
export const peekNextCode = (s: AppState, now: Date) => formatJobCode(now.getFullYear(), nextJobSeq(s))
export { parseJobCode }

/** Local simulation only: set the next demo job sequence (must be above every number already used). */
export function setJobCounter(s: AppState, n: number): AppState {
  const min = Math.max(0, ...s.jobs.map((j) => j.seq)) + 1
  if (!Number.isInteger(n) || n < min) return s
  return { ...s, jobCounter: n }
}

export function addClient(s: AppState, input: { name: string; type: ClientType; notes?: string; contact?: { name: string; phone: string; email: string } }, at: string): { state: AppState; client: Client } {
  const client: Client = {
    id: newId('cl'),
    name: input.name.trim(),
    type: input.type,
    notes: input.notes?.trim() ?? '',
    contacts: input.contact && (input.contact.name.trim() || input.contact.email.trim() || input.contact.phone.trim()) ? [{ id: newId('ct'), role: 'Buyer', name: input.contact.name.trim(), phone: input.contact.phone.trim(), email: input.contact.email.trim() }] : [],
    emailLog: [],
    reviewConsent: false,
    createdAt: at,
  }
  return { state: { ...s, clients: [...s.clients, client] }, client }
}

export interface NewJobInput {
  clientId?: string // existing client; otherwise a client is found by name or created
  client: string
  clientType: ClientType
  serviceType: ServiceType
  droneSurvey: boolean
  contactName: string // buyer
  contactPhone: string
  contactEmail: string
  siteContactName?: string
  siteContactPhone?: string
  siteContactEmail?: string
  siteAddress: string
  suburb: string
  quote: number
  notes?: string
}

export function addJob(s: AppState, input: NewJobInput, now: Date): { state: AppState; job: Job } {
  const at = now.toISOString()
  let state = s
  let client = (input.clientId && state.clients.find((c) => c.id === input.clientId)) || state.clients.find((c) => c.name.trim().toLowerCase() === input.client.trim().toLowerCase())
  if (!client) {
    const r = addClient(state, { name: input.client, type: input.clientType }, at)
    state = r.state
    client = r.client
  }
  const contacts = [...client.contacts]
  const ensure = (role: 'Buyer' | 'Site manager', name?: string, phone?: string, email?: string) => {
    if (!name?.trim() && !phone?.trim() && !email?.trim()) return undefined
    const hit = contacts.find((c) => c.name === name?.trim() && c.email === (email ?? '').trim() && c.role === role) ?? contacts.find((c) => name?.trim() && c.name === name.trim())
    if (hit) return hit.id
    const c = { id: newId('ct'), role, name: (name ?? '').trim(), phone: (phone ?? '').trim(), email: (email ?? '').trim() }
    contacts.push(c)
    return c.id
  }
  const buyerContactId = ensure('Buyer', input.contactName, input.contactPhone, input.contactEmail)
  const siteContactId = ensure('Site manager', input.siteContactName, input.siteContactPhone, input.siteContactEmail)
  const cid = client.id
  state = { ...state, clients: state.clients.map((c) => (c.id === cid ? { ...c, contacts } : c)) }
  const seq = nextJobSeq(state)
  const job: Job = {
    id: newId('job'),
    code: formatJobCode(now.getFullYear(), seq),
    seq,
    clientId: cid,
    client: client.name,
    clientType: client.type,
    serviceType: input.serviceType,
    droneSurvey: input.droneSurvey,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    buyerContactId,
    siteContactId,
    siteAddress: input.siteAddress.trim(),
    suburb: input.suburb.trim(),
    stage: 'Enquiry',
    quote: input.quote,
    kit: [],
    siteNotes: '',
    attachments: [],
    dates: {},
    inspections: [],
    siteDocs: { neighbourConsent: 'not-required' },
    createdAt: at,
    activity: [
      entry('system', 'Enquiry created', at),
      ...(input.notes?.trim() ? [entry('note', input.notes.trim(), at)] : []),
    ],
  }
  return { state: { ...state, jobs: [...state.jobs, job], jobCounter: seq + 1 }, job }
}

export function setQuote(s: AppState, jobId: string, quote: number, at: string): AppState {
  const job = findJob(s, jobId)
  if (!job || job.activeQuoteId) return s // value is driven by the quote builder once a quote exists
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
  return log(s, jobId, 'note', text.trim(), at)
}

/* ---------- quotes (all local: issue / approve / decline are SIMULATED) ---------- */

export function createQuote(s: AppState, jobId: string, at: string): { state: AppState; quote: Quote } | null {
  const job = findJob(s, jobId)
  if (!job) return null
  const prev = job.activeQuoteId ? findQuote(s, job.activeQuoteId) : undefined
  if (prev && (prev.status === 'draft' || prev.status === 'issued' || prev.status === 'approved')) return { state: s, quote: prev }
  const version = jobQuotesMaxVersion(s, jobId) + 1
  const quote = newQuoteDraft(job, version, s.catalogue, s.settings, at, newId('q'))
  let next: AppState = { ...s, quotes: [...s.quotes, quote] }
  next = patchJob(next, jobId, (j) => ({ ...j, activeQuoteId: quote.id }))
  next = log(next, jobId, 'system', `Quote ${quote.number} drafted from the job kit list`, at)
  next = syncJobValue(next, jobId)
  return { state: next, quote }
}
const jobQuotesMaxVersion = (s: AppState, jobId: string) => Math.max(0, ...s.quotes.filter((q) => q.jobId === jobId).map((q) => q.version))

/** Edit a quote (draft only — issued/approved quotes are locked; revise instead). */
export function updateQuote(s: AppState, quote: Quote): AppState {
  const cur = findQuote(s, quote.id)
  if (!cur || cur.status !== 'draft') return s
  const next = patchQuote(s, quote.id, () => ({ ...quote, status: 'draft' }))
  return syncJobValue(next, quote.jobId)
}

export function issueQuote(s: AppState, quoteId: string, at: string): AppState {
  const q = findQuote(s, quoteId)
  const job = q && findJob(s, q.jobId)
  if (!q || !job || q.status !== 'draft' || q.lines.length === 0) return s
  return moveJob(s, job.id, 'Quote', at)
}

export function approveQuote(s: AppState, quoteId: string, at: string): AppState {
  const q = findQuote(s, quoteId)
  const job = q && findJob(s, q.jobId)
  if (!q || !job || q.id !== job.activeQuoteId || q.status === 'approved' || q.status === 'superseded') return s
  let next = s
  if (job.stage === 'Declined') next = moveJob(next, job.id, 'Quote', at)
  return moveJob(next, job.id, 'Approved', at)
}

export function declineQuote(s: AppState, quoteId: string, reason: string, at: string): AppState {
  const q = findQuote(s, quoteId)
  const job = q && findJob(s, q.jobId)
  if (!q || !job || q.id !== job.activeQuoteId || q.status === 'superseded') return s
  return moveJob(s, job.id, 'Declined', at, reason.trim())
}

/** New draft version of a declined/issued quote (approved quotes use variations instead). */
export function reviseQuote(s: AppState, quoteId: string, at: string): { state: AppState; quote: Quote } | null {
  const q = findQuote(s, quoteId)
  const job = q && findJob(s, q.jobId)
  if (!q || !job || q.status === 'approved' || q.status === 'draft') return null
  const version = jobQuotesMaxVersion(s, job.id) + 1
  const quote: Quote = { ...q, id: newId('q'), number: `${job.code}-Q${version}`, version, status: 'draft', createdAt: at, issuedAt: undefined, decidedAt: undefined, declineReason: undefined, depositReceivedAt: undefined, lines: q.lines.map((l) => ({ ...l, id: newId('ql') })) }
  let next: AppState = patchQuote({ ...s, quotes: [...s.quotes, quote] }, q.id, (x) => ({ ...x, status: 'superseded' }))
  next = patchJob(next, job.id, (j) => ({ ...j, activeQuoteId: quote.id }))
  next = log(next, job.id, 'system', `Quote revised: ${quote.number} drafted (previous ${q.number} superseded)`, at)
  if (job.stage === 'Quote' || job.stage === 'Declined') next = moveJob(next, job.id, 'Enquiry', at)
  return { state: syncJobValue(next, job.id), quote }
}

/** Simulated deposit receipt (no payment is taken). */
export function markDepositReceived(s: AppState, quoteId: string, at: string): AppState {
  const q = findQuote(s, quoteId)
  if (!q || !q.depositEnabled || q.status !== 'approved' || q.depositReceivedAt) return s
  return log(patchQuote(s, quoteId, (x) => ({ ...x, depositReceivedAt: at })), q.jobId, 'system', 'Deposit marked received (simulated — no payment taken)', at)
}

/* ---------- variations ---------- */

export function addVariation(
  s: AppState,
  jobId: string,
  input: { description: string; sellDelta: number; costDelta: number; kitDeltas?: KitLine[] },
  at: string,
): AppState {
  const job = findJob(s, jobId)
  if (!job || !input.description.trim() || job.stage === 'Declined' || !isApprovedOrLater(job.stage)) return s
  const n = s.variations.filter((v) => v.jobId === jobId).length + 1
  const v: Variation = {
    id: newId('var'),
    jobId,
    number: `VAR-${n}`,
    description: input.description.trim(),
    sellDelta: Number.isFinite(input.sellDelta) ? input.sellDelta : 0,
    costDelta: Number.isFinite(input.costDelta) ? input.costDelta : 0,
    kitDeltas: (input.kitDeltas ?? []).filter((k) => k.qty !== 0),
    status: 'proposed',
    createdAt: at,
  }
  return log({ ...s, variations: [...s.variations, v] }, jobId, 'system', `Variation ${v.number} proposed: ${v.description}`, at)
}

export function decideVariation(s: AppState, variationId: string, decision: 'approved' | 'declined', at: string): AppState {
  const v = s.variations.find((x) => x.id === variationId)
  if (!v || v.status !== 'proposed') return s
  let next: AppState = { ...s, variations: s.variations.map((x) => (x.id === variationId ? { ...x, status: decision, decidedAt: at } : x)) }
  if (decision === 'approved') {
    next = patchJob(next, v.jobId, (j) => {
      const map = new Map(j.kit.map((k) => [k.itemId, k.qty]))
      for (const d of v.kitDeltas) map.set(d.itemId, Math.max(0, (map.get(d.itemId) ?? 0) + d.qty))
      return { ...j, kit: [...map.entries()].filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty })) }
    })
    next = syncJobValue(next, v.jobId)
  }
  return log(next, v.jobId, 'system', `Variation ${v.number} ${decision}${decision === 'approved' ? ` — contract value now $${findJob(next, v.jobId)!.quote.toLocaleString('en-AU')}` : ''}`, at)
}

/* ---------- warehouse return ---------- */

export const returnComplete = (c: { lines: { id: string }[]; returned?: Record<string, number> }) =>
  c.lines.length > 0 && c.lines.every((l) => c.returned?.[l.id] !== undefined)

export function setReturned(s: AppState, jobId: string, lineId: string, qty: number | undefined, at: string): AppState {
  const c = s.checklists[jobId]
  if (!c || !c.lines.some((l) => l.id === lineId)) return s
  const returned = { ...(c.returned ?? {}) }
  if (qty === undefined || !Number.isFinite(qty)) delete returned[lineId]
  else returned[lineId] = Math.max(0, Math.floor(qty))
  const was = returnComplete(c)
  const nc = { ...c, returned }
  let next: AppState = { ...s, checklists: { ...s.checklists, [jobId]: nc } }
  const now = returnComplete(nc)
  if (now && !was) {
    next = patchJob(next, jobId, (j) => ({ ...j, dates: { ...j.dates, returnedAt: dateOnly(at) } }))
    const short = nc.lines.reduce((a, l) => a + Math.max(0, l.qty - (returned[l.id] ?? 0)), 0)
    next = log(next, jobId, 'system', `Warehouse return unpack complete${short ? ` — ${short} unit(s) short/damaged (record only)` : ' — nothing missing'}`, at)
  } else if (!now && was) {
    next = patchJob(next, jobId, (j) => ({ ...j, dates: { ...j.dates, returnedAt: undefined } }))
  }
  return next
}

export function setJobDate(s: AppState, jobId: string, field: 'buildDate' | 'takedownDate', date: string): AppState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return s
  return patchJob(s, jobId, (j) => ({ ...j, dates: { ...j.dates, [field]: date } }))
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
  if (!item.name.trim() || !(item.unitWeightKg > 0)) return s
  return { ...s, catalogue: [...s.catalogue, { ...item, id: newId('kit') }] }
}

export const checklistIsStale = (s: AppState, job: Job) => {
  const c = s.checklists[job.id]
  return !!c && c.kitSignature !== kitSignature(job.kit)
}
