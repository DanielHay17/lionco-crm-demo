import { defaultPricing } from './kitPricing'
import { parseJobCode } from './jobCodes'
import { withDemoSitePin } from './sitePins'
import { isStage } from './stages'
import type { AppState, Client, Contact, Job, KitItem, MigrationItem, Settings, SiteDocsStatus } from './types'

export const DEFAULT_SETTINGS: Settings = {
  inspectionIntervalDays: 30,
  defaultHireWeeks: 4,
  defaultCrewDays: 3,
  defaultHoursPerDay: 8,
  labourCostRate: 52,
  labourChargeRate: 78,
  defaultDepositPct: 20,
}

export const DEFAULT_MIGRATION: MigrationItem[] = [
  { id: 'm-cust-export', group: 'Customers', label: 'Export customer list from the current system', done: false },
  { id: 'm-cust-dedupe', group: 'Customers', label: 'De-duplicate customers and agree contact roles (buyer / site manager)', done: false },
  { id: 'm-vend-export', group: 'Vendors', label: 'Export supplier and subcontractor list', done: false },
  { id: 'm-vend-abn', group: 'Vendors', label: 'Check supplier details are complete before import', done: false },
  { id: 'm-seq-last', group: 'Job sequences', label: 'Record the last job number used in the old system', done: false },
  { id: 'm-seq-start', group: 'Job sequences', label: 'Decide the starting job number for the new system (no gaps, no reuse)', done: false },
  { id: 'm-open-inv', group: 'Open items', label: 'List open invoices and unpaid bills at cut-over', done: false },
  { id: 'm-open-jobs', group: 'Open items', label: 'List jobs still in progress and map them to pipeline stages', done: false },
  { id: 'm-cut-test', group: 'Cut-over', label: 'Dry-run a sample import and reconcile totals', done: false },
  { id: 'm-cut-date', group: 'Cut-over', label: 'Agree a cut-over date and a freeze window', done: false },
]

const DEFAULT_DOCS: SiteDocsStatus = { neighbourConsent: 'not-required' }

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const numOr = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** A client id derived from a (legacy) client name — stable across repeated migrations. */
export const legacyClientId = (name: string) => `cl-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed'}`

/**
 * Backwards-compatible persisted-state migration. Accepts v1 (original MVP) and v2 documents and returns a
 * complete v2 state; unknown/invalid input returns null. Idempotent: migrating a v2 state returns equivalent data.
 */
export function migrateState(raw: unknown): AppState | null {
  const s = raw as (Partial<Omit<AppState, 'version'>> & { version?: number }) | null
  if (!s || typeof s !== 'object') return null
  if (s.version !== 1 && s.version !== 2) return null
  if (!Array.isArray(s.jobs) || !Array.isArray(s.expenses) || !Array.isArray(s.catalogue) || !Array.isArray(s.people)) return null
  if (typeof s.checklists !== 'object' || s.checklists === null) return null

  const catalogue: KitItem[] = s.catalogue.map((c) => {
    const d = defaultPricing(c)
    return {
      ...c,
      ownedQty: numOr(c.ownedQty, Math.max(20, Math.round(300 / Math.max(1, c.unitWeightKg)) * 4)),
      weeklyRentalPrice: numOr(c.weeklyRentalPrice, d.weeklyRentalPrice),
      weeklyCost: numOr(c.weeklyCost, d.weeklyCost),
      labourHoursPerUnit: numOr(c.labourHoursPerUnit, d.labourHoursPerUnit),
    }
  })

  const clients = new Map<string, Client>()
  for (const c of Array.isArray(s.clients) ? s.clients : []) clients.set(c.id, { ...c, contacts: c.contacts ?? [], emailLog: c.emailLog ?? [], notes: str(c.notes), reviewConsent: !!c.reviewConsent })

  let maxSeq = 0
  const jobs: Job[] = s.jobs.map((j, i) => {
    const legacy = j as Partial<Job> & Pick<Job, 'id' | 'code' | 'client'>
    const clientId = legacy.clientId && clients.has(legacy.clientId) ? legacy.clientId : legacyClientId(legacy.client ?? '')
    let client = clients.get(clientId)
    if (!client) {
      client = { id: clientId, name: str(legacy.client, 'Unnamed client'), type: legacy.clientType ?? 'Builder', notes: '', contacts: [], emailLog: [], reviewConsent: false, createdAt: str(legacy.createdAt, new Date(0).toISOString()) }
      clients.set(clientId, client)
    }
    let buyerContactId = legacy.buyerContactId
    if (!buyerContactId && (legacy.contactName || legacy.contactEmail || legacy.contactPhone)) {
      const existing = client.contacts.find((c) => c.name === legacy.contactName && c.email === legacy.contactEmail)
      if (existing) buyerContactId = existing.id
      else {
        const contact: Contact = { id: `ct-${legacy.id}`, name: str(legacy.contactName), role: 'Buyer', phone: str(legacy.contactPhone), email: str(legacy.contactEmail) }
        client.contacts.push(contact)
        buyerContactId = contact.id
      }
    }
    const seq = numOr(legacy.seq, parseJobCode(str(legacy.code))?.seq ?? i + 1)
    maxSeq = Math.max(maxSeq, seq)
    return withDemoSitePin({
      ...(legacy as Job),
      seq,
      clientId,
      buyerContactId,
      stage: isStage(legacy.stage) ? legacy.stage : 'Enquiry',
      kit: Array.isArray(legacy.kit) ? legacy.kit : [],
      activity: Array.isArray(legacy.activity) ? legacy.activity : [],
      siteNotes: str(legacy.siteNotes),
      attachments: legacy.attachments ?? [],
      dates: legacy.dates ?? {},
      inspections: legacy.inspections ?? [],
      siteDocs: legacy.siteDocs ?? { ...DEFAULT_DOCS },
    })
  })

  return {
    version: 2,
    jobs,
    expenses: s.expenses,
    checklists: s.checklists,
    catalogue,
    people: s.people,
    revenueHistory: Array.isArray(s.revenueHistory) ? s.revenueHistory : [],
    monthlyTarget: numOr(s.monthlyTarget, 55000),
    clients: [...clients.values()],
    quotes: Array.isArray(s.quotes) ? s.quotes : [],
    variations: Array.isArray(s.variations) ? s.variations : [],
    settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
    jobCounter: Math.max(numOr(s.jobCounter, 0), maxSeq + 1),
    syncQueue: Array.isArray(s.syncQueue) ? s.syncQueue : [],
    captureInbox: Array.isArray(s.captureInbox) ? s.captureInbox : [],
    migrationChecklist: Array.isArray(s.migrationChecklist) ? s.migrationChecklist : DEFAULT_MIGRATION.map((m) => ({ ...m })),
  }
}
