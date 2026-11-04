export const STAGES = [
  'Enquiry',
  'Quote',
  'Approved',
  'Job in progress',
  'Invoiced',
  'Paid',
  'Google review requested',
] as const
export type Stage = (typeof STAGES)[number]

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

export interface Job {
  id: string
  code: string // fixed, auto-generated e.g. LC-2026-014
  client: string
  clientType: ClientType
  contactName: string
  contactPhone: string
  contactEmail: string
  siteAddress: string
  suburb: string
  stage: Stage
  quote: number // AUD
  kit: KitLine[]
  activity: ActivityEntry[]
  createdAt: string
  paidAt?: string // set when job reaches Paid
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
}

export interface MonthlyRevenue {
  month: string // YYYY-MM
  revenue: number
}

export interface AppState {
  version: 1
  jobs: Job[]
  expenses: Expense[]
  checklists: Record<string, Checklist>
  catalogue: KitItem[]
  people: Person[]
  revenueHistory: MonthlyRevenue[]
  monthlyTarget: number
}
