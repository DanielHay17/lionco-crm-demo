/**
 * Demo seed data. EVERYTHING here is made up — fictional clients, people, phone numbers
 * (04xx 000 xxx) and example.com emails. Dates are generated relative to "now" so the
 * demo always looks current.
 */
import { buildChecklist, kitSignature } from './checklist'
import { addDays, dateOnly } from './dates'
import { DEFAULT_MIGRATION, DEFAULT_SETTINGS } from './migrate'
import { defaultPricing } from './kitPricing'
import { computeQuote, DEFAULT_TERMS, kitLines, labourLine, newLineId } from './quote'
import { isKitReserved } from './stages'
import { monthKey, ymd } from './format'
import { formatJobCode } from './jobCodes'
import { computeBalance } from './loadBalance'
import {
  STAGES,
  type ActivityEntry,
  type AppState,
  type CaptureItem,
  type Checklist,
  type Client,
  type ClientType,
  type EmailLogEntry,
  type JobDates,
  type Quote,
  type QuoteStatus,
  type SyncItem,
  type Variation,
  type Expense,
  type ExpenseCategory,
  type ServiceType,
  type Job,
  type KitItem,
  type Person,
  type Stage,
  type Zone,
} from './types'

type BaseKit = Pick<KitItem, 'id' | 'name' | 'category' | 'unitWeightKg'>
const BASE_CATALOGUE: BaseKit[] = [
  { id: 'std30', name: 'Standard 3.0m', category: 'Standards', unitWeightKg: 17 },
  { id: 'std20', name: 'Standard 2.0m', category: 'Standards', unitWeightKg: 11.5 },
  { id: 'std10', name: 'Standard 1.0m', category: 'Standards', unitWeightKg: 6 },
  { id: 'led24', name: 'Ledger 2.4m', category: 'Ledgers', unitWeightKg: 10 },
  { id: 'led18', name: 'Ledger 1.8m', category: 'Ledgers', unitWeightKg: 7.5 },
  { id: 'led12', name: 'Ledger 1.2m', category: 'Ledgers', unitWeightKg: 5 },
  { id: 'tra12', name: 'Transom 1.2m', category: 'Transoms', unitWeightKg: 5.5 },
  { id: 'tra07', name: 'Transom 0.7m', category: 'Transoms', unitWeightKg: 3.5 },
  { id: 'base', name: 'Base plate', category: 'Footing', unitWeightKg: 2 },
  { id: 'jack', name: 'Adjustable screw jack', category: 'Footing', unitWeightKg: 4 },
  { id: 'sole', name: 'Sole board', category: 'Footing', unitWeightKg: 3 },
  { id: 'cplRA', name: 'Right-angle coupler', category: 'Couplers', unitWeightKg: 1 },
  { id: 'cplSW', name: 'Swivel coupler', category: 'Couplers', unitWeightKg: 1.3 },
  { id: 'plank24', name: 'Steel plank 2.4m', category: 'Decking', unitWeightKg: 17 },
  { id: 'plank18', name: 'Steel plank 1.8m', category: 'Decking', unitWeightKg: 13 },
  { id: 'toe24', name: 'Toe board 2.4m', category: 'Edge protection', unitWeightKg: 6 },
  { id: 'rail24', name: 'Guardrail 2.4m', category: 'Edge protection', unitWeightKg: 7.5 },
  { id: 'lad4', name: 'Ladder 4m', category: 'Access', unitWeightKg: 15 },
  { id: 'bay20', name: 'Ladder access bay / hatch deck', category: 'Access', unitWeightKg: 20 },
  { id: 'brace', name: 'Diagonal brace', category: 'Bracing & ties', unitWeightKg: 8 },
  { id: 'tie', name: 'Tie tube 1.5m', category: 'Bracing & ties', unitWeightKg: 6.5 },
  { id: 'hop', name: 'Hop-up bracket', category: 'Decking', unitWeightKg: 3.5 },
  { id: 'castor', name: 'Castor wheel (mobile tower)', category: 'Footing', unitWeightKg: 3.5 },
  { id: 'tube6', name: 'Scaffold tube 6.0m', category: 'Bracing & ties', unitWeightKg: 25 },
  { id: 'shade', name: 'Shade cloth roll', category: 'Sheeting', unitWeightKg: 12 },
  { id: 'net', name: 'Debris netting roll', category: 'Sheeting', unitWeightKg: 9 },
]

/** Fictional price list + stock. Owned quantities are calibrated against the seed jobs in buildSeed(). */
export const SEED_CATALOGUE: KitItem[] = BASE_CATALOGUE.map((b) => ({ ...b, ownedQty: 0, ...defaultPricing(b) }))

export const SEED_PEOPLE: Person[] = [
  { id: 'p-paul', name: 'Paul (Owner)', role: 'Owner' },
  { id: 'p-jake', name: 'Jake Moreno', role: 'Subcontractor' },
  { id: 'p-tom', name: 'Tom Kerrigan', role: 'Subcontractor' },
  { id: 'p-ruby', name: 'Ruby Chen', role: 'Subcontractor' },
  { id: 'p-aiden', name: 'Aiden Brooks', role: 'Labourer' },
  { id: 'p-sam', name: 'Sam Patel', role: 'Labourer' },
]

const MONTHLY_TARGET = 55000
// Revenue for the 11 months before the current one (oldest → newest). Made up.
const REVENUE_HISTORY = [41200, 52800, 48100, 58900, 63400, 44700, 51500, 66200, 57300, 49800, 53600]

interface JobSeed {
  client: string
  type: ClientType
  contact: string
  address: string
  suburb: string
  service: ServiceType
  drone?: boolean
  stage: Stage
  quote: number
  age: number // days since the enquiry was created
  since: number // days since the last stage change
  kit: Record<string, number>
  site?: string // site manager name (second contact)
  erectedAgo?: number // days since erection (overrides interpolation)
  declinedReason?: string
  notes?: string
}

// prettier-ignore
const JOB_SEEDS: JobSeed[] = [
  { client: 'Harbourline Strata Management', type: 'Strata manager', contact: 'Dana Whitlock', address: '48 Ocean St', suburb: 'Bondi', service: 'Commercial', drone: true, stage: 'Google review requested', quote: 27600, age: 74, since: 1,
    kit: { std30: 12, std20: 10, led24: 26, led18: 8, tra12: 22, base: 22, jack: 22, sole: 22, plank24: 36, toe24: 16, rail24: 14, lad4: 3, bay20: 2, brace: 10, tie: 14, cplRA: 90, cplSW: 40, shade: 6 } },
  { client: 'Reyes Painting Co', type: 'Painter', contact: 'Marco Reyes', address: '7 Station Lane', suburb: 'Parramatta', service: 'Residential', stage: 'Paid', quote: 11900, age: 61, since: 2,
    kit: { std20: 8, std10: 6, led24: 12, led18: 6, tra12: 10, base: 14, jack: 14, sole: 14, plank24: 14, toe24: 8, rail24: 6, lad4: 2, brace: 4, cplRA: 40, cplSW: 16 } },
  { client: 'Hollis Constructions', type: 'Builder', contact: 'Brett Hollis', address: '22 Tennyson Rd', suburb: 'Cronulla', service: 'Residential', stage: 'Paid', quote: 8200, age: 55, since: 3,
    kit: { std20: 6, std10: 4, led18: 8, tra07: 6, base: 10, jack: 10, plank18: 10, toe24: 6, lad4: 1, brace: 3, cplRA: 24, cplSW: 10 } },
  { client: 'Linh & Peter Nguyen', type: 'Homeowner', contact: 'Linh Nguyen', address: '31 Wattle Ave', suburb: 'Chatswood', service: 'Residential', stage: 'Invoiced', quote: 18500, age: 48, since: 6,
    kit: { std30: 8, std20: 8, led24: 14, led12: 6, tra12: 12, base: 16, jack: 16, sole: 16, plank24: 24, toe24: 10, rail24: 10, lad4: 2, bay20: 1, brace: 6, tie: 8, cplRA: 60, cplSW: 24, shade: 3 } },
  { client: 'Westridge Roofing', type: 'Trade contractor', contact: 'Karen Obi', address: 'Unit 4, 16 Lachlan Close', suburb: 'Penrith', service: 'Commercial', stage: 'Invoiced', quote: 22800, age: 44, since: 9,
    kit: { std30: 10, std20: 12, led24: 20, tra12: 16, base: 20, jack: 20, sole: 20, plank24: 30, plank18: 8, toe24: 14, rail24: 12, lad4: 2, bay20: 2, brace: 8, tie: 10, cplRA: 80, cplSW: 30, net: 4 } },
  { client: 'Parkview Strata Services', type: 'Strata manager', contact: 'Tomas Adeyemi', address: '18 Orchard Rd', suburb: 'Chatswood', service: 'Commercial', drone: true, stage: 'Erected', quote: 34500, age: 40, since: 28, erectedAgo: 28, site: 'Wen Li', notes: 'Strata requires full wrap on the street face. Hoarding permit on file. Keep the lift lobby clear on Fridays.',
    kit: { std30: 16, std20: 14, std10: 6, led24: 30, led18: 10, led12: 6, tra12: 24, tra07: 8, base: 28, jack: 28, sole: 28, plank24: 44, toe24: 20, rail24: 18, lad4: 4, bay20: 3, brace: 14, tie: 20, cplRA: 120, cplSW: 50, shade: 8, net: 4 } },
  { client: 'Alder & Finch Builders', type: 'Builder', contact: 'Callum Finch', address: '12 Brook St', suburb: 'Marrickville', service: 'Residential', stage: 'Job in progress', quote: 19800, age: 29, since: 8, site: 'Callum Finch', notes: 'Access via the laneway only. Sloping site — sole boards under every standard.',
    kit: { std30: 8, std20: 10, led24: 16, led18: 6, tra12: 14, base: 18, jack: 18, sole: 18, plank24: 26, toe24: 12, rail24: 10, lad4: 2, bay20: 1, brace: 6, tie: 8, cplRA: 64, cplSW: 24, shade: 4 } },
  { client: 'Coastal Edge Homes', type: 'Builder', contact: 'Priya Raman', address: '9 Surf Rd', suburb: 'Cronulla', service: 'Residential', stage: 'Takedown booked', quote: 26300, age: 55, since: 3, erectedAgo: 36, site: 'Bruno Silva', notes: 'Rear boundary is shared — neighbour access agreed. Takedown to start early to beat afternoon wind.',
    kit: { std30: 12, std20: 12, led24: 24, led18: 8, tra12: 18, base: 24, jack: 24, sole: 24, plank24: 34, toe24: 16, rail24: 14, lad4: 3, bay20: 2, brace: 10, tie: 14, cplRA: 96, cplSW: 36, net: 6 } },
  { client: 'Bondi Bright Painters', type: 'Painter', contact: 'Ellis Mercer', address: '14 Campbell Pde', suburb: 'Bondi', service: 'Residential', stage: 'Approved', quote: 15200, age: 19, since: 2,
    kit: { std30: 6, std20: 8, led24: 14, led18: 4, tra12: 10, base: 14, jack: 14, sole: 14, plank24: 20, toe24: 10, rail24: 8, lad4: 2, bay20: 1, brace: 6, cplRA: 48, cplSW: 20, shade: 4 } },
  { client: 'Hartigan Building Group', type: 'Builder', contact: 'Josh Hartigan', address: '63 Harris St', suburb: 'Parramatta', service: 'Commercial', stage: 'Approved', quote: 29800, age: 21, since: 1,
    kit: { std30: 14, std20: 12, led24: 26, led12: 8, tra12: 20, tra07: 6, base: 26, jack: 26, sole: 26, plank24: 38, toe24: 18, rail24: 16, lad4: 3, bay20: 2, brace: 12, tie: 16, cplRA: 100, cplSW: 44, net: 6 } },
  { client: 'Southern Cross Body Corporate', type: 'Strata manager', contact: 'Helen Park', address: '220 Alison Rd', suburb: 'Randwick', service: 'Commercial', drone: true, stage: 'Quote', quote: 58000, age: 14, since: 4,
    kit: { std30: 24, std20: 20, std10: 8, led24: 40, led18: 14, led12: 8, tra12: 32, tra07: 10, base: 40, jack: 40, sole: 40, plank24: 64, plank18: 12, toe24: 30, rail24: 24, lad4: 5, bay20: 4, brace: 22, tie: 30, cplRA: 180, cplSW: 70, shade: 12, net: 6 } },
  { client: 'Mia & Dan Tran', type: 'Homeowner', contact: 'Mia Tran', address: '27 Bedford St', suburb: 'Newtown', service: 'Residential', stage: 'Quote', quote: 6400, age: 9, since: 3,
    kit: { std20: 4, std10: 4, led18: 6, tra07: 4, base: 8, jack: 8, plank18: 8, toe24: 4, lad4: 1, brace: 2, cplRA: 20, cplSW: 8 } },
  { client: 'Kovac Renovations', type: 'Builder', contact: 'Ivan Kovac', address: '88 High St', suburb: 'Penrith', service: 'Residential', stage: 'Enquiry', quote: 12000, age: 4, since: 4,
    kit: { std20: 8, led24: 10, tra12: 8, base: 12, jack: 12, plank24: 14, toe24: 8, lad4: 2, cplRA: 36 } },
  { client: 'Sarah McAllister', type: 'Homeowner', contact: 'Sarah McAllister', address: '15 Elouera Rd', suburb: 'Cronulla', service: 'Expert Advice', stage: 'Enquiry', quote: 3600, age: 1, since: 1, kit: {} },
  { client: 'Pinnacle Property Group', type: 'Builder', contact: 'Nadia Farouk', address: 'Level 3, 40 Victoria Ave', suburb: 'Chatswood', service: 'Drone Services', stage: 'Enquiry', quote: 2400, age: 2, since: 2, kit: {} },
  { client: 'Hollis Constructions', type: 'Builder', contact: 'Brett Hollis', address: '5 Ocean Pl', suburb: 'Cronulla', service: 'Residential', stage: 'Build booked', quote: 9400, age: 12, since: 2, site: 'Dev Anand',
    kit: { std20: 6, std10: 4, led18: 8, tra07: 6, base: 10, jack: 10, plank18: 10, toe24: 6, lad4: 1, brace: 3, cplRA: 24, cplSW: 10 } },
  { client: 'Reyes Painting Co', type: 'Painter', contact: 'Marco Reyes', address: '41 Hunter St', suburb: 'Parramatta', service: 'Residential', stage: 'Dismantled', quote: 13200, age: 50, since: 1, erectedAgo: 33,
    kit: { std20: 8, std10: 6, led24: 12, led18: 6, tra12: 10, base: 14, jack: 14, sole: 14, plank24: 16, toe24: 8, rail24: 6, lad4: 2, brace: 4, cplRA: 40, cplSW: 16 } },
  { client: 'Harbourline Strata Management', type: 'Strata manager', contact: 'Dana Whitlock', address: '9 Marine Pde', suburb: 'Bondi', service: 'Commercial', stage: 'Warehouse return', quote: 16800, age: 45, since: 1, erectedAgo: 38,
    kit: { std30: 8, std20: 6, led24: 14, tra12: 10, base: 12, jack: 12, plank24: 18, toe24: 8, rail24: 8, lad4: 2, bay20: 1, brace: 6, cplRA: 48, cplSW: 18, net: 3 } },
  { client: 'Pinnacle Property Group', type: 'Builder', contact: 'Nadia Farouk', address: 'Level 5, 40 Victoria Ave', suburb: 'Chatswood', service: 'Commercial', stage: 'Declined', quote: 21500, age: 20, since: 6, declinedReason: 'Went with a competitor on price (fictional example)',
    kit: { std30: 10, std20: 8, led24: 18, tra12: 14, base: 18, jack: 18, plank24: 26, toe24: 12, rail24: 10, lad4: 2, brace: 8, cplRA: 70, cplSW: 24 } },
  ]

type ExpSeed = [job: number, daysAgo: number, supplier: string, who: string, cat: ExpenseCategory, what: string, why: string, amount: number]
// prettier-ignore
const EXPENSE_SEEDS: ExpSeed[] = [
  // 001 Bondi strata — healthy
  [1, 66, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Couplers & screw jacks top-up', 'Kit shortfall for 3-lift facade', 2840],
  [1, 64, 'Eastside Truck Hire', 'p-sam', 'Transport', '1-tonne truck, 2 days', 'Delivery and collection', 1260],
  [1, 64, 'Ampol Bondi Junction', 'p-sam', 'Fuel', 'Diesel', 'Truck runs to site', 142.6],
  [1, 63, 'Jake Moreno (invoice 114)', 'p-jake', 'Subcontractor labour', 'Erect crew, 3 days', 'Facade erect', 4950],
  [1, 62, 'Tom Kerrigan (invoice 031)', 'p-tom', 'Subcontractor labour', 'Rigger, 2 days', 'Hoisting & tie-ins', 2200],
  [1, 12, 'Jake Moreno (invoice 121)', 'p-jake', 'Subcontractor labour', 'Dismantle crew, 3 days', 'Strip out facade', 4650],
  [1, 11, 'Eastside Truck Hire', 'p-sam', 'Transport', '1-tonne truck, 1 day', 'Collect kit', 640],
  [1, 11, 'Waste Smart Transfer', 'p-aiden', 'Tip/disposal', 'Timber & wrap disposal', 'Tip run after dismantle', 185],
  // 002 Parramatta painters — healthy
  [2, 52, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Guardrail replacements', 'Damaged rails from last job', 620],
  [2, 50, 'Ruby Chen (invoice 08)', 'p-ruby', 'Subcontractor labour', 'Erect crew, 2 days', 'Erect scaffold', 2400],
  [2, 50, 'Shell Parramatta', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 96.4],
  [2, 20, 'Ruby Chen (invoice 11)', 'p-ruby', 'Subcontractor labour', 'Dismantle, 2 days', 'Strip out', 2300],
  [2, 20, 'Eastside Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery and collection', 1180],
  [2, 19, 'Western Sydney Tip', 'p-aiden', 'Tip/disposal', 'General waste', 'Site clean-up', 142],
  // 003 Cronulla builder — thin margin
  [2, 31, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Replacement base plates', 'Worn plates swapped out', 1800],
  [3, 46, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Sole boards & base plates', 'Soft ground on site', 740],
  [3, 45, 'Tom Kerrigan (invoice 028)', 'p-tom', 'Subcontractor labour', 'Erect crew, 2 days', 'Erect scaffold', 2150],
  [3, 45, 'Eastside Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery and collection', 1240],
  [3, 28, 'Sutherland Equipment Hire', 'p-paul', 'Equipment hire', 'Scissor lift, 1 day', 'Access for hard-to-reach tie-ins', 780],
  [3, 27, 'Tom Kerrigan (invoice 033)', 'p-tom', 'Subcontractor labour', 'Dismantle, 2 days', 'Strip out', 2050],
  [3, 27, 'BP Caringbah', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 118.5],
  [3, 26, 'Kurnell Waste Facility', 'p-aiden', 'Tip/disposal', 'Mixed waste', 'Site clean-up', 165],
  // 004 Chatswood homeowner — healthy
  [4, 40, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Shade cloth & ties', 'Neighbour dust complaint', 810],
  [4, 39, 'Jake Moreno (invoice 119)', 'p-jake', 'Subcontractor labour', 'Erect crew, 3 days', 'Erect scaffold', 4600],
  [4, 39, 'North Shore Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery and collection', 1320],
  [4, 14, 'Jake Moreno (invoice 124)', 'p-jake', 'Subcontractor labour', 'Dismantle crew, 3 days', 'Strip out', 4300],
  [4, 14, 'Shell Chatswood', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 124.3],
  [4, 13, 'Lane Cove Tip', 'p-aiden', 'Tip/disposal', 'Mixed waste', 'Site clean-up', 118],
  // 005 Penrith industrial — LOSS
  [4, 30, 'North Shore Equipment Hire', 'p-paul', 'Equipment hire', 'Boom lift, 1 day', 'Gutter and roof-edge access', 2400],
  [5, 38, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Extra planks and braces', 'Quoted kit was short on site', 3150],
  [5, 37, 'Ruby Chen (invoice 09)', 'p-ruby', 'Subcontractor labour', 'Erect crew, 4 days', 'Erect — took 1 day longer than quoted', 5200],
  [5, 37, 'Penrith Plant Hire', 'p-paul', 'Equipment hire', 'Telehandler, 3 days', 'Unquoted — site access', 3600],
  [5, 36, 'Eastside Truck Hire', 'p-sam', 'Transport', 'Truck hire, 3 days', 'Delivery plus 2 re-deliveries', 2250],
  [5, 24, 'Ruby Chen (invoice 12)', 'p-ruby', 'Subcontractor labour', 'Dismantle, 3 days', 'Strip out', 4400],
  [5, 24, 'Tom Kerrigan (invoice 036)', 'p-tom', 'Subcontractor labour', 'Rigger, 2 days', 'Extra hands to catch up', 2300],
  [5, 23, 'Ampol Penrith', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 286.9],
  [5, 23, 'Penrith Plant Hire', 'p-paul', 'Equipment hire', 'Telehandler, 2 days (dismantle)', 'Unquoted — site access', 2400],
  [5, 22, 'Western Sydney Tip', 'p-aiden', 'Tip/disposal', 'Builders waste', 'Left by others — had to clear', 1850],
  // 006 Chatswood strata — in progress
  [6, 30, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Netting & shade cloth', 'Strata requires full wrap', 2380],
  [6, 29, 'Jake Moreno (invoice 125)', 'p-jake', 'Subcontractor labour', 'Erect crew, 5 days', 'Erect scaffold', 7600],
  [6, 29, 'Tom Kerrigan (invoice 037)', 'p-tom', 'Subcontractor labour', 'Rigger, 3 days', 'Hoisting & ties', 3300],
  [6, 29, 'North Shore Truck Hire', 'p-sam', 'Transport', 'Truck hire, 3 days', 'Delivery in 2 loads', 1980],
  [6, 28, 'Shell Chatswood', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 168.2],
  [6, 12, 'Chatswood Council', 'p-paul', 'Other', 'Hoarding permit fee', 'Footpath occupation', 1240],
  [6, 6, 'Aiden Brooks', 'p-aiden', 'Subcontractor labour', 'Weekend adjustments', 'Client requested a lift change', 960],
  [6, 3, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Extra hatch decks', 'Access change', 1450],
  // 007 12 Brook St — in progress (the typo story job)
  [6, 8, 'Ruby Chen (invoice 14)', 'p-ruby', 'Subcontractor labour', 'Extra crew, 3 days', 'Client changed the lift sequence', 4200],
  [7, 26, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Base plates and sole boards', 'New footing for sloping site', 690],
  [7, 25, 'Jake Moreno (invoice 126)', 'p-jake', 'Subcontractor labour', 'Erect crew, 3 days', 'Erect scaffold', 4650],
  [7, 25, 'Inner West Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery', 1260],
  [7, 25, 'Ampol Marrickville', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 107.8],
  [7, 18, 'Bunnings Marrickville', 'p-aiden', 'Materials', 'Fixings, wrap, tape', 'Consumables', 214.65],
  [7, 10, 'Tom Kerrigan (invoice 038)', 'p-tom', 'Subcontractor labour', 'Rigger, 2 days', 'Add extra lift', 2200],
  [7, 9, 'Inner West Council Depot', 'p-aiden', 'Tip/disposal', 'Mixed waste', 'Clean-up', 96],
  [7, 5, 'Sydney Skip Bins', 'p-paul', 'Tip/disposal', '4m³ skip hire', 'Builder rubbish blocking access', 340],
  // 008 Cronulla — in progress, thin
  [7, 14, 'Ruby Chen (invoice 15)', 'p-ruby', 'Subcontractor labour', 'Erect crew, 2 days', 'Extra lift at the rear', 3400],
  [7, 12, 'Inner West Truck Hire', 'p-sam', 'Transport', 'Second delivery, 1 day', 'Extra lift kit', 980],
  [8, 17, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Extra braces & ties', 'Wind loading — engineer requirement', 1900],
  [8, 9, 'Tom Kerrigan (invoice 040)', 'p-tom', 'Subcontractor labour', 'Rigger, 3 days', 'Extra tie-ins', 3300],
  [8, 22, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Netting rolls & couplers', 'Wind exposure — full netting', 2920],
  [8, 21, 'Tom Kerrigan (invoice 039)', 'p-tom', 'Subcontractor labour', 'Erect crew, 4 days', 'Erect scaffold', 6800],
  [8, 21, 'Eastside Truck Hire', 'p-sam', 'Transport', 'Truck hire, 3 days', 'Delivery in 2 loads', 1890],
  [8, 21, 'BP Caringbah', 'p-sam', 'Fuel', 'Diesel', 'Truck runs', 154.9],
  [8, 14, 'Sutherland Equipment Hire', 'p-paul', 'Equipment hire', 'Boom lift, 2 days', 'Roof-line tie-ins', 1640],
  [8, 7, 'Ruby Chen (invoice 13)', 'p-ruby', 'Subcontractor labour', 'Extra crew, 3 days', 'Client brought forward the finish date', 4200],
  [8, 4, 'Kurnell Waste Facility', 'p-aiden', 'Tip/disposal', 'Mixed waste', 'Site clean-up', 210],
  // 009 / 010 approved — only early costs
  [9, 2, 'Bondi Junction Parking Inspector', 'p-paul', 'Other', 'Parking permit', 'Truck zone near site', 85],
  [10, 1, 'Metro Scaffold Supplies', 'p-paul', 'Materials', 'Replacement toe boards', 'Damaged on last job', 540],
  // 016 build booked — early costs only; 017 dismantled; 018 warehouse return
  [16, 1, 'Cronulla Parking Office', 'p-paul', 'Other', 'Parking permit', 'Truck zone near site', 70],
  [17, 32, 'Jake Moreno (invoice 127)', 'p-jake', 'Subcontractor labour', 'Erect crew, 3 days', 'Erect scaffold', 4300],
  [17, 32, 'Inner West Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery', 1260],
  [17, 1, 'Jake Moreno (invoice 131)', 'p-jake', 'Subcontractor labour', 'Dismantle, 2 days', 'Strip out', 2900],
  [18, 37, 'Tom Kerrigan (invoice 041)', 'p-tom', 'Subcontractor labour', 'Erect crew, 3 days', 'Erect scaffold', 5100],
  [18, 37, 'North Shore Truck Hire', 'p-sam', 'Transport', 'Truck hire, 2 days', 'Delivery', 1480],
  [18, 2, 'Tom Kerrigan (invoice 044)', 'p-tom', 'Subcontractor labour', 'Dismantle, 2 days', 'Strip out', 3300],
  [19, 15, 'Chatswood Council', 'p-paul', 'Other', 'Site inspection fee', 'Pre-quote site visit', 120],
]


const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86400000)
const hoursAgo = daysAgo

const slug = (n: string) => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const statusFor = (stage: Stage): QuoteStatus =>
  stage === 'Enquiry' ? 'draft' : stage === 'Quote' ? 'issued' : stage === 'Declined' ? 'declined' : 'approved'

export function buildSeed(now: Date = new Date()): AppState {
  const year = now.getFullYear()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 1, 0, 0)
  const idxPaid = STAGES.indexOf('Paid')
  const today = ymd(now)

  // ---- clients (one per distinct name) ----
  const clients: Client[] = []
  const clientByName = new Map<string, Client>()
  JOB_SEEDS.forEach((s) => {
    if (clientByName.has(s.client)) return
    const c: Client = { id: `cl-${slug(s.client)}`, name: s.client, type: s.type, notes: '', contacts: [], emailLog: [], reviewConsent: s.type === 'Homeowner' || s.client.startsWith('Hollis') , createdAt: hoursAgo(now, s.age + 20).toISOString() }
    clientByName.set(s.client, c)
    clients.push(c)
  })

  const stageTimes: Record<string, Partial<Record<Stage, string>>> = {}

  const jobs: Job[] = JOB_SEEDS.map((s, i) => {
    const k = STAGES.indexOf(s.stage as (typeof STAGES)[number])
    const declined = s.stage === 'Declined'
    const path: Stage[] = declined ? ['Enquiry', 'Quote', 'Declined'] : [...STAGES.slice(0, k + 1)]
    const created = hoursAgo(now, s.age)
    const id = `job-${i + 1}`
    const activity: ActivityEntry[] = [{ id: `seed-act-${i}-0`, at: created.toISOString(), kind: 'system', text: 'Enquiry created' }]
    let paidAt: string | undefined
    const times: Partial<Record<Stage, string>> = { Enquiry: created.toISOString() }
    const last = path.length - 1
    const idxE = path.indexOf('Erected')
    for (let st = 1; st <= last; st++) {
      let ago: number
      if (s.erectedAgo !== undefined && idxE > 0) {
        ago = st <= idxE ? s.age - ((s.age - s.erectedAgo) * st) / idxE : s.erectedAgo - ((s.erectedAgo - s.since) * (st - idxE)) / (last - idxE)
      } else ago = s.age - ((s.age - s.since) * st) / last
      let t = hoursAgo(now, ago)
      // Paid / review jobs always land in the current month so "revenue this month" is meaningful.
      if (path[st] === 'Paid' || path[st] === 'Google review requested') t = new Date(Math.min(now.getTime() - 60000, Math.max(t.getTime(), monthStart.getTime() + (st - idxPaid) * 3600000)))
      activity.push({ id: `seed-act-${i}-${st}`, at: t.toISOString(), kind: 'stage', text: `Stage changed: ${path[st - 1]} → ${path[st]}` })
      times[path[st]] = t.toISOString()
      if (path[st] === 'Paid') paidAt = t.toISOString()
    }
    if (declined) activity.push({ id: `seed-act-${i}-d`, at: times.Declined!, kind: 'note', text: `Declined: ${s.declinedReason}` })
    stageTimes[id] = times
    const d = (st: Stage) => (times[st] ? dateOnly(times[st]!) : undefined)
    const dates: JobDates = {
      approvedAt: d('Approved'),
      buildDate: d('Build booked') ? (s.stage === 'Build booked' ? addDays(today, 5) : d('Erected') ?? d('Build booked')) : undefined,
      erectedAt: d('Erected'),
      takedownDate: d('Takedown booked') ? (s.stage === 'Takedown booked' ? addDays(today, 4) : d('Dismantled') ?? d('Takedown booked')) : undefined,
      dismantledAt: d('Dismantled'),
      invoicedAt: d('Invoiced'),
    }
    const client = clientByName.get(s.client)!
    const email = `${s.contact.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`
    let buyer = client.contacts.find((c) => c.name === s.contact)
    if (!buyer) {
      buyer = { id: `ct-${client.id}-${client.contacts.length + 1}`, name: s.contact, role: 'Buyer', phone: `04${String(10 + i).padStart(2, '0')} 000 ${String(100 + i * 7).padStart(3, '0')}`, email }
      client.contacts.push(buyer)
    }
    let siteContactId: string | undefined
    if (s.site) {
      let sc = client.contacts.find((c) => c.name === s.site)
      if (!sc) {
        sc = { id: `ct-${client.id}-${client.contacts.length + 1}`, name: s.site, role: 'Site manager', phone: `04${String(40 + i).padStart(2, '0')} 000 ${String(300 + i * 5).padStart(3, '0')}`, email: `${s.site.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com` }
        client.contacts.push(sc)
      }
      siteContactId = sc.id
    }
    return {
      id,
      code: formatJobCode(year, i + 1),
      seq: i + 1,
      clientId: client.id,
      client: s.client,
      clientType: s.type,
      serviceType: s.service,
      droneSurvey: !!s.drone || s.service === 'Drone Services',
      contactName: buyer.name,
      contactPhone: buyer.phone,
      contactEmail: buyer.email,
      buyerContactId: buyer.id,
      siteContactId,
      siteAddress: s.address,
      suburb: s.suburb,
      stage: s.stage,
      quote: s.quote,
      kit: Object.entries(s.kit).map(([itemId, qty]) => ({ itemId, qty })),
      siteNotes: s.notes ?? '',
      attachments: [],
      dates,
      inspections: [],
      siteDocs: { neighbourConsent: 'not-required' },
      declinedReason: s.declinedReason,
      activity,
      createdAt: created.toISOString(),
      paidAt,
    } satisfies Job
  })

  // a couple of notes for colour
  jobs[6].activity.push({ id: 'seed-note-7', at: hoursAgo(now, 7).toISOString(), kind: 'note', text: 'Callum confirmed access via the laneway. Extra lift added at the rear — no change to quote.' })
  jobs[4].activity.push({ id: 'seed-note-5', at: hoursAgo(now, 20).toISOString(), kind: 'note', text: 'Margin blew out: telehandler hire and tip fees were not in the quote. Lesson for future quotes.' })

  // site documentation / inspection demo records
  jobs[5].siteDocs = { neighbourConsent: 'received', folderPrintedAt: addDays(today, -27), handoverPrintedAt: addDays(today, -27), handoverSignedOff: { date: addDays(today, -27), by: 'Wen Li (fictional)' } }
  jobs[5].attachments = [{ id: 'att-6-1', kind: 'Schematic', label: 'Street-face elevation (placeholder)', note: 'Illustrative sketch only — no file stored', includeOnQuote: true, addedAt: hoursAgo(now, 38).toISOString() }]
  jobs[7].siteDocs = { neighbourConsent: 'required-pending', folderPrintedAt: addDays(today, -35) }
  jobs[7].inspections = [{ id: 'insp-8-1', date: addDays(today, -33), by: 'Bruno Silva (fictional)', outcome: 'No issues noted', notes: 'Demo record: ties and base plates looked fine.' }]
  jobs[7].attachments = [{ id: 'att-8-1', kind: 'Site sketch', label: 'Rear boundary sketch', note: 'Hand sketch — placeholder', includeOnQuote: false, addedAt: hoursAgo(now, 50).toISOString() }]

  const expenses: Expense[] = EXPENSE_SEEDS.map(([n, ago, supplier, personId, category, description, reason, amount], i) => ({
    id: `exp-${i + 1}`,
    jobId: `job-${n}`,
    date: ymd(hoursAgo(now, ago)),
    supplier,
    personId,
    description,
    category,
    reason,
    amount,
  }))

  // ---- stock: owned quantities calibrated to what approved-or-later seed jobs have reserved ----
  const reserved = new Map<string, number>()
  for (const j of jobs) if (isKitReserved(j.stage)) for (const kl of j.kit) reserved.set(kl.itemId, (reserved.get(kl.itemId) ?? 0) + kl.qty)
  const TIGHT = new Set(['plank24', 'jack', 'cplRA']) // deliberately tight so the large Quote-stage job shows a shortage warning
  const catalogue: KitItem[] = SEED_CATALOGUE.map((c) => {
    const r = reserved.get(c.id) ?? 0
    return { ...c, ownedQty: TIGHT.has(c.id) ? r + 14 : Math.max(24, Math.ceil(r * 1.25) + 6) }
  })

  // ---- quotes: built with the same price list / crew formula the app uses; allowance line makes sell == job.quote ----
  const quotes: Quote[] = []
  jobs.forEach((j, i) => {
    if (j.kit.length === 0) return
    const times = stageTimes[j.id]
    const status = statusFor(j.stage)
    const base: Quote = {
      id: `q-${i + 1}`,
      jobId: j.id,
      number: `${j.code}-Q1`,
      version: 1,
      status,
      hireWeeks: 4,
      lines: kitLines(j.kit, catalogue),
      crewDays: 3,
      hoursPerDay: 8,
      depositEnabled: j.serviceType === 'Residential' && j.quote < 12000,
      depositPct: 20,
      terms: DEFAULT_TERMS,
      createdAt: times.Enquiry!,
      issuedAt: times.Quote,
      decidedAt: status === 'approved' ? times.Approved : status === 'declined' ? times.Declined : undefined,
      declineReason: status === 'declined' ? j.declinedReason : undefined,
    }
    const lab = labourLine(base, catalogue, DEFAULT_SETTINGS)
    const lines = [...base.lines, ...(lab ? [lab] : []), { id: newLineId(), kind: 'transport' as const, description: 'Truck delivery & collection', qty: 2, unitPrice: 380, unitCost: 215 }]
    const so = computeQuote({ ...base, lines })
    const diff = Math.round((j.quote - so.sell) * 100) / 100
    lines.push({ id: newLineId(), kind: 'other', description: diff >= 0 ? 'Site allowances & project fee' : 'Negotiated discount', qty: 1, unitPrice: diff, unitCost: diff > 0 ? Math.round(diff * 0.3) : 0 })
    quotes.push({ ...base, lines })
    j.activeQuoteId = base.id
  })

  // ---- variations (proposed / declined only, so contract values — and the CEO dashboard — are unchanged) ----
  const variations: Variation[] = [
    { id: 'var-1', jobId: 'job-7', quoteId: 'q-7', number: 'VAR-1', description: 'Extra lift at the rear (client request)', sellDelta: 2400, costDelta: 1500, kitDeltas: [{ itemId: 'plank24', qty: 6 }, { itemId: 'rail24', qty: 4 }], status: 'proposed', createdAt: hoursAgo(now, 3).toISOString() },
    { id: 'var-2', jobId: 'job-8', quoteId: 'q-8', number: 'VAR-1', description: 'Additional netting to north face', sellDelta: 900, costDelta: 650, kitDeltas: [{ itemId: 'net', qty: 3 }], status: 'declined', createdAt: hoursAgo(now, 20).toISOString(), decidedAt: hoursAgo(now, 18).toISOString() },
  ]

  // ---- checklists for every approved-or-later job, built with the same generator the app uses ----
  const checklists: Record<string, Checklist> = {}
  jobs.forEach((j, i) => {
    if (j.stage === 'Declined' || STAGES.indexOf(j.stage as (typeof STAGES)[number]) < STAGES.indexOf('Approved')) return
    const cl = buildChecklist(j, catalogue, hoursAgo(now, JOB_SEEDS[i].since + 0.1).toISOString())
    if (!cl) return
    const beyondApproved = STAGES.indexOf(j.stage as (typeof STAGES)[number]) > STAGES.indexOf('Approved')
    cl.lines.forEach((l, li) => {
      l.ticked = beyondApproved || (j.code.endsWith('010') ? li % 2 === 0 : li < 3)
    })
    checklists[j.id] = cl
  })
  // job 18 is mid-way through its warehouse return
  const ret = checklists['job-18']
  if (ret) ret.returned = Object.fromEntries(ret.lines.slice(0, Math.ceil(ret.lines.length / 2)).map((l, n) => [l.id, n === 1 ? Math.max(0, l.qty - 2) : l.qty]))

  // Job 009 (Bondi Bright Painters): someone loaded the truck front-heavy → visible red flag in the demo.
  const skew = checklists['job-9']
  if (skew) {
    const total = skew.lines.reduce((sum, l) => sum + l.qty * l.unitWeightKg, 0)
    const sorted = [...skew.lines].sort((a, b) => b.qty * b.unitWeightKg - a.qty * a.unitWeightKg)
    let cum = 0
    const frontZones: Zone[] = ['FL', 'FL', 'FR']
    sorted.forEach((l, i) => {
      l.zone = cum / total < 0.74 ? frontZones[i % 3] : 'RR'
      cum += l.qty * l.unitWeightKg
    })
    const merged = new Map<string, (typeof skew.lines)[number]>()
    for (const l of skew.lines) {
      const id = `${l.itemId}-${l.zone}`
      const ex = merged.get(id)
      if (ex) {
        ex.qty += l.qty
        ex.ticked = ex.ticked && l.ticked
      } else merged.set(id, { ...l, id })
    }
    skew.lines = [...merged.values()]
    skew.kitSignature = kitSignature(jobs[8].kit)
    if (computeBalance(skew.lines).status !== 'warning') throw new Error('seed: expected job-9 to be unbalanced')
  }

  // ---- mock integrations data (all fictional, local only) ----
  const at = (d: number) => hoursAgo(now, d).toISOString()
  const sync = (id: string, kind: SyncItem['kind'], jobN: number, status: SyncItem['status'], d: number): SyncItem => {
    const j = jobs[jobN - 1]
    return { id, kind, jobId: j.id, summary: kind === 'quote-sync' ? `Quote ${j.code}-Q1 to CRM/Xero (mock)` : `Invoice draft for ${j.code} (mock — nothing sent to Xero)`, amount: j.quote, status, createdAt: at(d), updatedAt: at(d) }
  }
  const syncQueue: SyncItem[] = [
    sync('sync-1', 'invoice-draft', 4, 'queued', 6),
    sync('sync-2', 'invoice-draft', 5, 'approved', 9),
    sync('sync-3', 'invoice-draft', 2, 'reconciled', 4),
    sync('sync-4', 'invoice-draft', 3, 'reconciled', 5),
    sync('sync-5', 'quote-sync', 11, 'queued', 4),
    sync('sync-6', 'quote-sync', 12, 'synced', 3),
    sync('sync-7', 'invoice-draft', 1, 'reconciled', 1),
  ]
  const captureInbox: CaptureItem[] = [
    { id: 'cap-1', receivedAt: at(1), supplier: 'Metro Scaffold Supplies', subject: 'Tax invoice available online (link only)', issue: 'hyperlink-only', link: 'https://supplier.example.com/invoice/INV-0000 (fictional)', amountHint: 1180, status: 'pending' },
    { id: 'cap-2', receivedAt: at(2), supplier: 'Eastside Truck Hire', subject: 'Receipt forwarded to bills inbox — forwarding failed', issue: 'forward-failed', amountHint: 630, status: 'pending' },
    { id: 'cap-3', receivedAt: at(4), supplier: 'Sutherland Equipment Hire', subject: 'Your hire invoice (download link)', issue: 'hyperlink-only', link: 'https://hire.example.com/dl/0000 (fictional)', amountHint: 820, status: 'pending' },
  ]
  const em = (n: string, jobN: number | undefined, d: number, dir: 'in' | 'out', subject: string, snippet: string): EmailLogEntry => ({ id: `em-${n}`, at: at(d), direction: dir, subject, snippet, jobId: jobN ? jobs[jobN - 1].id : undefined })
  for (const c of clients) {
    const first = jobs.find((j) => j.clientId === c.id)!
    const n = Number(first.id.split('-')[1])
    c.emailLog = [
      em(`${c.id}-1`, n, first.activity.length ? 3 : 1, 'in', `Enquiry — ${first.siteAddress}`, 'Demo email: Hi, could you quote for scaffold at the address below…'),
      em(`${c.id}-2`, n, 2, 'out', `Quote ${first.code}-Q1 (demo)`, 'Demo email: Thanks for your enquiry — please find the quote attached…'),
    ]
  }
  clients.find((c) => c.name.startsWith('Hollis'))!.notes = 'Repeat builder client — prefers email. (Fictional demo note.)'

  const history = REVENUE_HISTORY.map((revenue, i) => ({
    month: monthKey(new Date(now.getFullYear(), now.getMonth() - (REVENUE_HISTORY.length - i), 1)),
    revenue,
  }))

  return {
    version: 2,
    jobs,
    expenses,
    checklists,
    catalogue,
    people: SEED_PEOPLE.map((p) => ({ ...p })),
    revenueHistory: history,
    monthlyTarget: MONTHLY_TARGET,
    clients,
    quotes,
    variations,
    settings: { ...DEFAULT_SETTINGS },
    jobCounter: jobs.length + 1,
    syncQueue,
    captureInbox,
    migrationChecklist: DEFAULT_MIGRATION.map((m) => ({ ...m })),
  }
}
