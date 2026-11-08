import { ALL_STAGES, STAGES, type MainStage, type Stage } from './types'

export type PhaseId = 'sales' | 'build' | 'takedown' | 'billing'

export interface Phase {
  id: PhaseId
  label: string
  stages: Stage[]
}

/** Stages grouped by operational phase (used for Kanban lanes and filters). */
export const PHASES: Phase[] = [
  { id: 'sales', label: 'Sales', stages: ['Enquiry', 'Quote', 'Approved', 'Declined'] },
  { id: 'build', label: 'Build', stages: ['Job in progress', 'Build booked', 'Erected'] },
  { id: 'takedown', label: 'Takedown & return', stages: ['Takedown booked', 'Dismantled', 'Warehouse return'] },
  { id: 'billing', label: 'Billing', stages: ['Invoiced', 'Paid', 'Google review requested'] },
]

export const phaseOf = (s: Stage): Phase => PHASES.find((p) => p.stages.includes(s))!

export const STAGE_HINT: Record<Stage, string> = {
  Enquiry: 'New enquiry — site details and kit being worked out',
  Quote: 'Quote built from kit; issued (simulated) and awaiting a decision',
  Approved: 'Quote approved — packing list generated, kit reserved',
  Declined: 'Quote declined — can be re-opened to Enquiry or Quote',
  'Job in progress': 'Packing the truck / preparing for build',
  'Build booked': 'Build date booked with the crew',
  Erected: 'Scaffold is up — inspection reminder runs while it stands',
  'Takedown booked': 'Takedown date booked',
  Dismantled: 'Scaffold dismantled on site',
  'Warehouse return': 'Kit back at the yard — return & unpack checklist',
  Invoiced: 'Invoice drafted (mock Xero sync queue)',
  Paid: 'Payment received (simulated)',
  'Google review requested': 'Review request previewed (nothing is sent)',
}

/** Stage accents — deliberately not green/amber/red, which are reserved for status. */
export const STAGE_COLOR: Record<Stage, string> = {
  Enquiry: '#94a3b8',
  Quote: '#38bdf8',
  Approved: '#6366f1',
  Declined: '#9ca3af',
  'Job in progress': '#172566',
  'Build booked': '#3a4a9e',
  Erected: '#0d9488',
  'Takedown booked': '#c026d3',
  Dismantled: '#a21caf',
  'Warehouse return': '#7e22ce',
  Invoiced: '#a855f7',
  Paid: '#0891b2',
  'Google review requested': '#475569',
}

/** Index in the main path; Declined is -1 (outside the path). */
export const stageIndex = (s: Stage): number => (STAGES as readonly Stage[]).indexOf(s)

export const isMainStage = (s: Stage): s is MainStage => s !== 'Declined'
export const isStage = (s: unknown): s is Stage => typeof s === 'string' && (ALL_STAGES as readonly string[]).includes(s)

export const atOrAfter = (s: Stage, ref: MainStage) => stageIndex(s) >= stageIndex(ref)

export const isPaidStage = (s: Stage) => atOrAfter(s, 'Paid')
export const isApprovedOrLater = (s: Stage) => atOrAfter(s, 'Approved')
/** Jobs only show profit once work has started. */
export const isCosted = (s: Stage) => atOrAfter(s, 'Job in progress')
/** Kit physically committed (reserved) from approval until it is back and unpacked. */
export const isKitReserved = (s: Stage) => atOrAfter(s, 'Approved') && stageIndex(s) <= stageIndex('Warehouse return')
/** Scaffold is standing on site. */
export const isUpInAir = (s: Stage) => atOrAfter(s, 'Erected') && stageIndex(s) <= stageIndex('Takedown booked')
/** Counts as live operational work (booked, not yet billed). */
export const isInField = (s: Stage) => atOrAfter(s, 'Job in progress') && stageIndex(s) <= stageIndex('Warehouse return')

/** Declined can only be re-opened to Enquiry or Quote. Everything else on the main path is free (drag or buttons). */
export function canMove(from: Stage, to: Stage): boolean {
  if (from === to) return false
  if (from === 'Declined') return to === 'Enquiry' || to === 'Quote'
  return true
}

/** Next / previous stage along the lifecycle. Declined: forward re-opens to Quote, back to Enquiry. */
export function neighbourStage(s: Stage, dir: 1 | -1): Stage | undefined {
  if (s === 'Declined') return dir === 1 ? 'Quote' : 'Enquiry'
  return STAGES[stageIndex(s) + dir]
}

/** Map bubble groups. */
export type MapGroup = 'quoted' | 'approved' | 'erected' | 'takedown' | 'complete' | 'declined'
export const MAP_GROUPS: { id: MapGroup; label: string; color: string; stages: Stage[] }[] = [
  { id: 'quoted', label: 'Quoted', color: '#38bdf8', stages: ['Enquiry', 'Quote'] },
  { id: 'approved', label: 'Approved', color: '#6366f1', stages: ['Approved', 'Job in progress', 'Build booked'] },
  { id: 'erected', label: 'Erected', color: '#0d9488', stages: ['Erected'] },
  { id: 'takedown', label: 'Takedown', color: '#c026d3', stages: ['Takedown booked', 'Dismantled', 'Warehouse return'] },
  { id: 'complete', label: 'Billed / complete', color: '#64748b', stages: ['Invoiced', 'Paid', 'Google review requested'] },
  { id: 'declined', label: 'Declined', color: '#cbd5e1', stages: ['Declined'] },
]
export const mapGroupOf = (s: Stage): MapGroup => MAP_GROUPS.find((g) => g.stages.includes(s))!.id
