/**
 * Operational job lifecycle (main path). "Job in progress" = approved work being prepared/packed.
 * "Declined" is an off-ramp (not in STAGES): a declined job can be re-opened to Enquiry or Quote.
 */
export const STAGES = [
  'Enquiry',
  'Quote',
  'Approved',
  'Job in progress',
  'Build booked',
  'Erected',
  'Takedown booked',
  'Dismantled',
  'Warehouse return',
  'Invoiced',
  'Paid',
  'Google review requested',
] as const
export type MainStage = (typeof STAGES)[number]
export type Stage = MainStage | 'Declined'
export const ALL_STAGES: readonly Stage[] = [...STAGES, 'Declined']

export const ZONES = ['FL', 'FR', 'RL', 'RR'] as const
export type Zone = (typeof ZONES)[number]
export const ZONE_LABEL: Record<Zone, string> = {
  FL: 'Front-Left',
  FR: 'Front-Right',
  RL: 'Rear-Left',
  RR: 'Rear-Right',
}

export const EXPENSE_CATEGORIES = [
  'Materials',
  'Subcontractor labour',
  'Transport',
  'Equipment hire',
  'Fuel',
  'Tip/disposal',
  'Other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CLIENT_TYPES = ['Builder', 'Strata manager', 'Homeowner', 'Painter', 'Trade contractor'] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const SERVICE_TYPES = ['Residential', 'Commercial', 'Expert Advice', 'Drone Services'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export type PersonRole = 'Owner' | 'Subcontractor' | 'Labourer'
export interface Person {
  id: string
  name: string
  role: PersonRole
}

export interface KitItem {
  id: string
  name: string
  category: string
  unitWeightKg: number
  /** Units owned (stock). Fictional demo quantity. */
  ownedQty: number
  /** Fictional customer rental price per unit per week (ex GST). */
  weeklyRentalPrice: number
  /** Fictional internal cost per unit per week (handling / wear). Never shown to customers. */
  weeklyCost: number
  /** Fictional person-hours per unit for erect + dismantle (feeds the crew formula). */
  labourHoursPerUnit: number
}

export interface KitLine {
  itemId: string
  qty: number
}

export interface ActivityEntry {
  id: string
  at: string // ISO timestamp
  kind: 'stage' | 'note' | 'system'
  text: string
}

export type ContactRole = 'Buyer' | 'Site manager' | 'Accounts' | 'Other'
export const CONTACT_ROLES: ContactRole[] = ['Buyer', 'Site manager', 'Accounts', 'Other']

export interface Contact {
  id: string
  name: string
  role: ContactRole
  phone: string
  email: string
}

/** MOCK Gmail activity: demo entries only, nothing is read from or sent to Gmail. */
export interface EmailLogEntry {
  id: string
  at: string
  direction: 'in' | 'out'
  subject: string
  snippet: string
  jobId?: string
}

export interface Client {
  id: string
  name: string
  type: ClientType
  notes: string
  contacts: Contact[]
  emailLog: EmailLogEntry[]
  /** Demo flag: has this client agreed to be sent follow-up / review requests? */
  reviewConsent: boolean
  createdAt: string
}

export interface SiteAttachment {
  id: string
  kind: 'Schematic' | 'Site sketch' | 'Photo' | 'Other'
  label: string
  note: string
  /** Only the file NAME is recorded. File contents are never read, stored or uploaded. */
  fileName?: string
  includeOnQuote: boolean
  addedAt: string
}

/** YYYY-MM-DD strings. */
export interface JobDates {
  approvedAt?: string
  buildDate?: string // booked build date (placeholder default is editable)
  erectedAt?: string
  takedownDate?: string // booked takedown date
  dismantledAt?: string
  returnedAt?: string // warehouse return fully unpacked
  invoicedAt?: string
}

export interface InspectionRecord {
  id: string
  date: string // YYYY-MM-DD
  by: string
  outcome: 'No issues noted' | 'Follow-up needed'
  notes: string
}

export type NeighbourConsent = 'not-required' | 'required-pending' | 'received'
export interface SiteDocsStatus {
  neighbourConsent: NeighbourConsent
  folderPrintedAt?: string
  handoverPrintedAt?: string
  handoverSignedOff?: { date: string; by: string }
}

export interface Job {
  id: string
  code: string // fixed, auto-generated e.g. LC-2026-014 (local simulation, not Xero numbering)
  /** Stable sequential number behind the code. Never reused. */
  seq: number
  clientId: string
  client: string // denormalised client name (kept in sync by renameClient)
  clientType: ClientType
  serviceType: ServiceType
  droneSurvey: boolean // drone site survey / footage add-on
  /** Legacy single-contact snapshot (kept for compatibility); roles below are the source of truth. */
  contactName: string
  contactPhone: string
  contactEmail: string
  buyerContactId?: string
  siteContactId?: string
  siteAddress: string
  suburb: string
  stage: Stage
  quote: number // AUD ex GST — contract value (active quote sell + approved variations)
  activeQuoteId?: string
  kit: KitLine[]
  siteNotes: string
  attachments: SiteAttachment[]
  dates: JobDates
  inspections: InspectionRecord[]
  siteDocs: SiteDocsStatus
  declinedReason?: string
  activity: ActivityEntry[]
  createdAt: string
  paidAt?: string // set when job reaches Paid
}

export type QuoteStatus = 'draft' | 'issued' | 'approved' | 'declined' | 'superseded'
export type QuoteLineKind = 'kit' | 'labour' | 'transport' | 'other'

export interface QuoteLine {
  id: string
  kind: QuoteLineKind
  description: string
  itemId?: string
  qty: number // units (kit), hours (labour), count (transport/other)
  unitPrice: number // sell per unit (per week for kit); may be negative for a discount
  unitCost: number // internal cost per unit (per week for kit)
}

export interface Quote {
  id: string
  jobId: string
  number: string // demo ref e.g. LC-2026-014-Q1 (not a Xero number)
  version: number
  status: QuoteStatus
  hireWeeks: number
  lines: QuoteLine[]
  crewDays: number
  hoursPerDay: number
  depositEnabled: boolean
  depositPct: number
  depositReceivedAt?: string // simulated
  terms: string
  createdAt: string
  issuedAt?: string
  decidedAt?: string
  declineReason?: string
}

export interface Variation {
  id: string
  jobId: string
  number: string // e.g. VAR-1 within the job
  description: string
  sellDelta: number
  costDelta: number
  kitDeltas: KitLine[] // signed quantity changes
  status: 'proposed' | 'approved' | 'declined'
  createdAt: string
  decidedAt?: string
}

export interface Expense {
  id: string
  jobId: string
  date: string // YYYY-MM-DD
  supplier: string // where
  personId: string // who
  description: string // what
  category: ExpenseCategory
  reason: string // why
  amount: number // AUD ex GST
}

export interface ChecklistLine {
  id: string
  itemId: string
  name: string
  qty: number
  unitWeightKg: number
  zone: Zone
  ticked: boolean
}

export interface Checklist {
  jobId: string
  generatedAt: string
  kitSignature: string
  lines: ChecklistLine[]
  /** Warehouse return: quantity actually returned per line id (absent = not yet checked). */
  returned?: Record<string, number>
}

export interface MonthlyRevenue {
  month: string // YYYY-MM
  revenue: number
}

export interface Settings {
  inspectionIntervalDays: number // demo reminder only — not legal guidance
  defaultHireWeeks: number
  defaultCrewDays: number
  defaultHoursPerDay: number
  labourCostRate: number // fictional $/person-hour internal cost
  labourChargeRate: number // fictional $/person-hour charged
  defaultDepositPct: number
}

export type SyncKind = 'quote-sync' | 'invoice-draft'
export type SyncStatus = 'queued' | 'synced' | 'approved' | 'declined' | 'reconciled'
/** MOCK Xero queue: entries only ever change locally. */
export interface SyncItem {
  id: string
  kind: SyncKind
  jobId: string
  summary: string
  amount: number
  status: SyncStatus
  createdAt: string
  updatedAt: string
}

export interface CaptureItem {
  id: string
  receivedAt: string
  supplier: string
  subject: string
  issue: 'hyperlink-only' | 'forward-failed'
  link?: string // fictional text only — never rendered as a live link
  amountHint?: number
  status: 'pending' | 'allocated' | 'dismissed'
  expenseId?: string
}

export interface MigrationItem {
  id: string
  group: 'Customers' | 'Vendors' | 'Job sequences' | 'Open items' | 'Cut-over'
  label: string
  done: boolean
}

export interface AppState {
  version: 2
  jobs: Job[]
  expenses: Expense[]
  checklists: Record<string, Checklist>
  catalogue: KitItem[]
  people: Person[]
  revenueHistory: MonthlyRevenue[]
  monthlyTarget: number
  clients: Client[]
  quotes: Quote[]
  variations: Variation[]
  settings: Settings
  /** Next local demo job sequence number (never reused). */
  jobCounter: number
  syncQueue: SyncItem[]
  captureInbox: CaptureItem[]
  migrationChecklist: MigrationItem[]
}
