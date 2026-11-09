/** Smaller local mutations: clients & contacts, site records, settings, stock edits, mock-integration state. All pure. */
import { addExpense, entry, findJob, newId, type ExpenseInput } from './state'
import type {
  AppState,
  Client,
  ClientType,
  Contact,
  EmailLogEntry,
  ExpenseCategory,
  InspectionRecord,
  Job,
  KitItem,
  ServiceType,
  Settings,
  SiteAttachment,
  SiteDocsStatus,
  SyncStatus,
} from './types'

const patchJob = (s: AppState, jobId: string, fn: (j: Job) => Job): AppState => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobId ? fn(j) : j)) })
const patchClient = (s: AppState, id: string, fn: (c: Client) => Client): AppState => ({ ...s, clients: s.clients.map((c) => (c.id === id ? fn(c) : c)) })
const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

/* ---------- clients & contacts ---------- */

export function updateClient(s: AppState, id: string, patch: Partial<Pick<Client, 'name' | 'type' | 'notes' | 'reviewConsent'>>): AppState {
  if (patch.name !== undefined && !patch.name.trim()) return s
  const name = patch.name?.trim()
  let next = patchClient(s, id, (c) => ({ ...c, ...patch, ...(name ? { name } : {}) }))
  if (name !== undefined || patch.type !== undefined) {
    next = { ...next, jobs: next.jobs.map((j) => (j.clientId === id ? { ...j, client: name ?? j.client, clientType: (patch.type as ClientType | undefined) ?? j.clientType } : j)) }
  }
  return next
}

export function addContact(s: AppState, clientId: string, c: Omit<Contact, 'id'>): AppState {
  if (!c.name.trim()) return s
  return patchClient(s, clientId, (cl) => ({ ...cl, contacts: [...cl.contacts, { ...c, id: newId('ct'), name: c.name.trim() }] }))
}

export function updateContact(s: AppState, clientId: string, c: Contact): AppState {
  if (!c.name.trim()) return s
  let next = patchClient(s, clientId, (cl) => ({ ...cl, contacts: cl.contacts.map((x) => (x.id === c.id ? c : x)) }))
  // keep the legacy single-contact snapshot on jobs in sync for the buyer role
  next = { ...next, jobs: next.jobs.map((j) => (j.clientId === clientId && j.buyerContactId === c.id ? { ...j, contactName: c.name, contactPhone: c.phone, contactEmail: c.email } : j)) }
  return next
}

export function removeContact(s: AppState, clientId: string, contactId: string): AppState {
  const next = patchClient(s, clientId, (cl) => ({ ...cl, contacts: cl.contacts.filter((x) => x.id !== contactId) }))
  return {
    ...next,
    jobs: next.jobs.map((j) =>
      j.clientId === clientId ? { ...j, buyerContactId: j.buyerContactId === contactId ? undefined : j.buyerContactId, siteContactId: j.siteContactId === contactId ? undefined : j.siteContactId } : j,
    ),
  }
}

export function setJobContacts(s: AppState, jobId: string, ids: { buyerContactId?: string; siteContactId?: string }): AppState {
  const job = findJob(s, jobId)
  const client = job && s.clients.find((c) => c.id === job.clientId)
  if (!job || !client) return s
  const ok = (id?: string) => !id || client.contacts.some((c) => c.id === id)
  if (!ok(ids.buyerContactId) || !ok(ids.siteContactId)) return s
  const buyer = client.contacts.find((c) => c.id === ids.buyerContactId)
  return patchJob(s, jobId, (j) => ({ ...j, buyerContactId: ids.buyerContactId, siteContactId: ids.siteContactId, ...(buyer ? { contactName: buyer.name, contactPhone: buyer.phone, contactEmail: buyer.email } : {}) }))
}

/** MOCK Gmail logging: appends a demo entry to the client; nothing is read from or sent to Gmail. */
export function addEmailLog(s: AppState, clientId: string, e: Omit<EmailLogEntry, 'id'>): AppState {
  return patchClient(s, clientId, (c) => ({ ...c, emailLog: [{ ...e, id: newId('em') }, ...c.emailLog] }))
}

/* ---------- job site records ---------- */

export function updateJobSite(s: AppState, jobId: string, p: Partial<{ siteAddress: string; suburb: string; serviceType: ServiceType; droneSurvey: boolean; siteNotes: string }>): AppState {
  if ((p.siteAddress !== undefined && !p.siteAddress.trim()) || (p.suburb !== undefined && !p.suburb.trim())) return s
  return patchJob(s, jobId, (j) => ({ ...j, ...p, ...(p.siteAddress !== undefined ? { siteAddress: p.siteAddress.trim() } : {}), ...(p.suburb !== undefined ? { suburb: p.suburb.trim() } : {}) }))
}

export function addAttachment(s: AppState, jobId: string, a: Omit<SiteAttachment, 'id' | 'addedAt'>, at: string): AppState {
  if (!a.label.trim()) return s
  return patchJob(s, jobId, (j) => ({ ...j, attachments: [...j.attachments, { ...a, label: a.label.trim(), id: newId('att'), addedAt: at }] }))
}
export const updateAttachment = (s: AppState, jobId: string, id: string, p: Partial<SiteAttachment>): AppState =>
  patchJob(s, jobId, (j) => ({ ...j, attachments: j.attachments.map((a) => (a.id === id ? { ...a, ...p } : a)) }))
export const removeAttachment = (s: AppState, jobId: string, id: string): AppState => patchJob(s, jobId, (j) => ({ ...j, attachments: j.attachments.filter((a) => a.id !== id) }))

export const setSiteDocs = (s: AppState, jobId: string, p: Partial<SiteDocsStatus>): AppState => patchJob(s, jobId, (j) => ({ ...j, siteDocs: { ...j.siteDocs, ...p } }))

export function addInspection(s: AppState, jobId: string, r: Omit<InspectionRecord, 'id'>, at: string): AppState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !r.by.trim()) return s
  return patchJob(s, jobId, (j) => ({
    ...j,
    inspections: [...j.inspections, { ...r, by: r.by.trim(), id: newId('insp') }],
    activity: [...j.activity, entry('system', `Inspection recorded (demo record): ${r.outcome}`, at)],
  }))
}

/* ---------- settings & stock ---------- */

export function updateSettings(s: AppState, p: Partial<Settings>): AppState {
  const next = { ...s.settings }
  for (const [k, v] of Object.entries(p) as [keyof Settings, number][]) {
    if (!Number.isFinite(v) || v < 0) continue
    next[k] = v
  }
  return { ...s, settings: next }
}

export function updateKitItem(s: AppState, id: string, p: Partial<Omit<KitItem, 'id'>>): AppState {
  const clean: Partial<KitItem> = {}
  if (p.name !== undefined && p.name.trim()) clean.name = p.name.trim()
  if (p.category !== undefined && p.category.trim()) clean.category = p.category.trim()
  for (const k of ['unitWeightKg', 'ownedQty', 'weeklyRentalPrice', 'weeklyCost', 'labourHoursPerUnit'] as const) {
    const v = p[k]
    if (v !== undefined && Number.isFinite(v) && v >= 0 && !(k === 'unitWeightKg' && v === 0)) clean[k] = k === 'ownedQty' ? Math.floor(v) : v
  }
  return { ...s, catalogue: s.catalogue.map((c) => (c.id === id ? { ...c, ...clean } : c)) }
}

/* ---------- mock integrations ---------- */

const NEXT: Record<string, SyncStatus[]> = {
  'quote-sync:queued': ['synced'],
  'invoice-draft:queued': ['approved', 'declined'],
  'invoice-draft:approved': ['reconciled'],
}
export const syncTransitions = (kind: string, status: SyncStatus): SyncStatus[] => NEXT[`${kind}:${status}`] ?? []

/** Simulated Xero state change. Only allowed along the mock workflow; nothing is sent anywhere. */
export function setSyncStatus(s: AppState, id: string, to: SyncStatus, at: string): AppState {
  const it = s.syncQueue.find((x) => x.id === id)
  if (!it || !syncTransitions(it.kind, it.status).includes(to)) return s
  let next: AppState = { ...s, syncQueue: s.syncQueue.map((x) => (x.id === id ? { ...x, status: to, updatedAt: at } : x)) }
  next = patchJob(next, it.jobId, (j) => ({ ...j, activity: [...j.activity, entry('system', `Mock Xero queue: ${it.kind === 'invoice-draft' ? 'invoice draft' : 'quote sync'} marked ${to} (simulated)`, at)] }))
  return next
}

export function allocateCapture(
  s: AppState,
  captureId: string,
  input: { jobId: string; personId: string; category: ExpenseCategory; amount: number; description: string; date: string },
  at: string,
): AppState {
  const it = s.captureInbox.find((c) => c.id === captureId)
  if (!it || it.status !== 'pending') return s
  const exp: ExpenseInput = { jobId: input.jobId, date: input.date, supplier: it.supplier, personId: input.personId, description: input.description, category: input.category, reason: 'Allocated by a person from the capture-exception inbox (mock)', amount: num(input.amount) }
  const next = addExpense(s, exp, at)
  if (next === s) return s // validation failed — nothing allocated
  const created = next.expenses[next.expenses.length - 1]
  return { ...next, captureInbox: next.captureInbox.map((c) => (c.id === captureId ? { ...c, status: 'allocated', expenseId: created.id } : c)) }
}

export const dismissCapture = (s: AppState, id: string): AppState => ({ ...s, captureInbox: s.captureInbox.map((c) => (c.id === id && c.status === 'pending' ? { ...c, status: 'dismissed' } : c)) })

export const toggleMigration = (s: AppState, id: string): AppState => ({ ...s, migrationChecklist: s.migrationChecklist.map((m) => (m.id === id ? { ...m, done: !m.done } : m)) })
