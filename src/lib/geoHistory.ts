/**
 * Extra fictional Sydney jobs so the Analytics map has a realistic spread.
 * Every one is an old paid job (420+ days before "now") on a made-up customer.
 * They count toward client booked/paid LTV. They do not move the CEO dashboard's
 * 12-month revenue, open pipeline, stock or the live Kanban.
 */
import { formatJobCode } from './jobCodes'
import { suburbByName } from './sydneyGeo'
import { ymd } from './format'
import type { Client, ClientType, Expense, Job, ServiceType } from './types'

/** Must stay above ARCHIVE_AFTER_DAYS so these jobs never enter the live CEO window. */
const MIN_AGE_DAYS = 420

const NEW_CLIENTS: { name: string; type: ClientType }[] = [
  { name: 'Hillcrest Homes', type: 'Builder' },
  { name: 'Bayline Strata', type: 'Strata manager' },
  { name: 'Georges River Maintenance', type: 'Trade contractor' },
  { name: 'Westlink Constructions', type: 'Builder' },
  { name: 'Redfern Coatings', type: 'Painter' },
  { name: 'Mosman Facade Group', type: 'Builder' },
]

type Spec = {
  client: string
  suburb: string
  address: string
  quote: number
  daysAgo: number
  service: ServiceType
  drone?: boolean
}

// prettier-ignore
const SPECS: Spec[] = [
  { client: 'Harbourline Strata Management', suburb: 'Bondi', address: '12 Hall St', quote: 24800, daysAgo: 480, service: 'Commercial', drone: true },
  { client: 'Harbourline Strata Management', suburb: 'Bronte', address: '8 Hewlett St', quote: 31200, daysAgo: 620, service: 'Commercial', drone: true },
  { client: 'Harbourline Strata Management', suburb: 'Coogee', address: '41 Beach St', quote: 27400, daysAgo: 910, service: 'Commercial' },
  { client: 'Harbourline Strata Management', suburb: 'Rose Bay', address: '3 New South Head Rd', quote: 35400, daysAgo: 1100, service: 'Commercial', drone: true },
  { client: 'Bondi Bright Painters', suburb: 'Bondi Junction', address: '90 Oxford St', quote: 9800, daysAgo: 540, service: 'Residential' },
  { client: 'Bondi Bright Painters', suburb: 'Double Bay', address: '18 Cross St', quote: 12400, daysAgo: 730, service: 'Residential' },
  { client: 'Bondi Bright Painters', suburb: 'Woollahra', address: '55 Queen St', quote: 8600, daysAgo: 1280, service: 'Residential' },
  { client: 'Bondi Bright Painters', suburb: 'Paddington', address: '22 William St', quote: 11200, daysAgo: 860, service: 'Residential' },
  { client: 'Bondi Bright Painters', suburb: 'Clovelly', address: '7 Burnie St', quote: 7400, daysAgo: 1420, service: 'Residential' },
  { client: 'Bondi Bright Painters', suburb: 'Maroubra', address: '16 Marine Pde', quote: 15300, daysAgo: 1010, service: 'Residential' },
  { client: 'Harbourline Strata Management', suburb: 'Vaucluse', address: '4 Wentworth Rd', quote: 29850, daysAgo: 1500, service: 'Commercial' },
  { client: 'Harbourline Strata Management', suburb: 'Randwick', address: '80 Belmore Rd', quote: 22100, daysAgo: 700, service: 'Commercial' },

  { client: 'Alder & Finch Builders', suburb: 'Leichhardt', address: '27 Norton St', quote: 18600, daysAgo: 500, service: 'Residential' },
  { client: 'Alder & Finch Builders', suburb: 'Balmain', address: '9 Darling St', quote: 21400, daysAgo: 640, service: 'Residential' },
  { client: 'Alder & Finch Builders', suburb: 'Annandale', address: '44 Johnston St', quote: 16700, daysAgo: 880, service: 'Residential' },
  { client: 'Alder & Finch Builders', suburb: 'Dulwich Hill', address: '15 New Canterbury Rd', quote: 13250, daysAgo: 1200, service: 'Residential' },
  { client: 'Alder & Finch Builders', suburb: 'Ashfield', address: '6 Hercules St', quote: 14900, daysAgo: 1050, service: 'Residential' },
  { client: 'Redfern Coatings', suburb: 'Petersham', address: '31 Railway St', quote: 6900, daysAgo: 560, service: 'Residential' },
  { client: 'Redfern Coatings', suburb: 'Stanmore', address: '12 Percival Rd', quote: 8200, daysAgo: 990, service: 'Residential' },
  { client: 'Redfern Coatings', suburb: 'Summer Hill', address: '48 Smith St', quote: 9100, daysAgo: 1340, service: 'Residential' },
  { client: 'Alder & Finch Builders', suburb: 'Marrickville', address: '70 Illawarra Rd', quote: 19100, daysAgo: 760, service: 'Residential' },
  { client: 'Redfern Coatings', suburb: 'Newtown', address: '5 King St', quote: 7450, daysAgo: 1180, service: 'Residential' },

  { client: 'Parkview Strata Services', suburb: 'Lane Cove', address: '14 Burns Bay Rd', quote: 33200, daysAgo: 510, service: 'Commercial', drone: true },
  { client: 'Parkview Strata Services', suburb: 'Willoughby', address: '8 Penshurst St', quote: 28700, daysAgo: 690, service: 'Commercial' },
  { client: 'Parkview Strata Services', suburb: 'Roseville', address: '21 Hill St', quote: 24600, daysAgo: 940, service: 'Commercial' },
  { client: 'Parkview Strata Services', suburb: 'Lindfield', address: '3 Pacific Hwy', quote: 26800, daysAgo: 1230, service: 'Commercial', drone: true },
  { client: 'Parkview Strata Services', suburb: 'Gordon', address: '17 Werona Ave', quote: 30500, daysAgo: 1480, service: 'Commercial' },
  { client: 'Mosman Facade Group', suburb: 'Mosman', address: '45 Military Rd', quote: 22400, daysAgo: 580, service: 'Commercial' },
  { client: 'Mosman Facade Group', suburb: 'Neutral Bay', address: '12 Ben Boyd Rd', quote: 17600, daysAgo: 820, service: 'Residential' },
  { client: 'Mosman Facade Group', suburb: 'Cremorne', address: '28 Spofforth St', quote: 15800, daysAgo: 1110, service: 'Residential' },
  { client: 'Linh & Peter Nguyen', suburb: 'Chatswood', address: '9 Help St', quote: 14200, daysAgo: 1350, service: 'Residential' },
  { client: 'Parkview Strata Services', suburb: 'St Leonards', address: '60 Pacific Hwy', quote: 38900, daysAgo: 470, service: 'Commercial', drone: true },

  { client: 'Bayline Strata', suburb: 'Manly', address: '18 Pittwater Rd', quote: 27650, daysAgo: 530, service: 'Commercial' },
  { client: 'Bayline Strata', suburb: 'Dee Why', address: '42 Howard Ave', quote: 24100, daysAgo: 710, service: 'Commercial', drone: true },
  { client: 'Bayline Strata', suburb: 'Freshwater', address: '7 Lawrence St', quote: 16400, daysAgo: 960, service: 'Residential' },
  { client: 'Bayline Strata', suburb: 'Narrabeen', address: '25 Ocean St', quote: 19200, daysAgo: 1280, service: 'Residential' },
  { client: 'Coastal Edge Homes', suburb: 'Mona Vale', address: '11 Bungan St', quote: 21300, daysAgo: 600, service: 'Residential' },
  { client: 'Coastal Edge Homes', suburb: 'Collaroy', address: '33 Pittwater Rd', quote: 18700, daysAgo: 1080, service: 'Residential' },
  { client: 'Bayline Strata', suburb: 'Brookvale', address: '90 Old Pittwater Rd', quote: 15600, daysAgo: 1400, service: 'Commercial' },
  { client: 'Coastal Edge Homes', suburb: 'Fairlight', address: '6 Lauderdale Ave', quote: 17400, daysAgo: 840, service: 'Residential' },

  { client: 'Hillcrest Homes', suburb: 'Castle Hill', address: '14 Terminus St', quote: 23600, daysAgo: 490, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Baulkham Hills', address: '8 Old Northern Rd', quote: 19850, daysAgo: 670, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Bella Vista', address: '22 Lexington Dr', quote: 26400, daysAgo: 900, service: 'Commercial' },
  { client: 'Hillcrest Homes', suburb: 'Kellyville', address: '5 Windsor Rd', quote: 17200, daysAgo: 1150, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Rouse Hill', address: '31 Cudgegong Rd', quote: 18900, daysAgo: 1380, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Pennant Hills', address: '16 Yarrara Rd', quote: 15400, daysAgo: 780, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Cherrybrook', address: '44 Castle Hill Rd', quote: 20100, daysAgo: 1020, service: 'Residential' },
  { client: 'Hillcrest Homes', suburb: 'Dural', address: '9 New Line Rd', quote: 16800, daysAgo: 1520, service: 'Residential' },

  { client: 'Hartigan Building Group', suburb: 'Parramatta', address: '20 Church St', quote: 31250, daysAgo: 450, service: 'Commercial' },
  { client: 'Hartigan Building Group', suburb: 'Merrylands', address: '15 Merrylands Rd', quote: 18650, daysAgo: 630, service: 'Commercial' },
  { client: 'Hartigan Building Group', suburb: 'Auburn', address: '8 South Pde', quote: 22450, daysAgo: 870, service: 'Commercial' },
  { client: 'Reyes Painting Co', suburb: 'Liverpool', address: '55 Macquarie St', quote: 9750, daysAgo: 545, service: 'Residential' },
  { client: 'Reyes Painting Co', suburb: 'Bankstown', address: '12 Chapel Rd', quote: 11300, daysAgo: 995, service: 'Residential' },
  { client: 'Reyes Painting Co', suburb: 'Fairfield', address: '27 The Crescent', quote: 8650, daysAgo: 1210, service: 'Residential' },
  { client: 'Westridge Roofing', suburb: 'Penrith', address: '40 High St', quote: 24750, daysAgo: 610, service: 'Commercial' },
  { client: 'Westridge Roofing', suburb: 'St Marys', address: '6 Queen St', quote: 17650, daysAgo: 1085, service: 'Commercial' },
  { client: 'Westridge Roofing', suburb: 'Mount Druitt', address: '18 Luxford Rd', quote: 16450, daysAgo: 1320, service: 'Commercial' },
  { client: 'Westridge Roofing', suburb: 'Richmond', address: '3 March St', quote: 14100, daysAgo: 1490, service: 'Residential' },
  { client: 'Westlink Constructions', suburb: 'Blacktown', address: '25 Main St', quote: 27300, daysAgo: 505, service: 'Commercial' },
  { client: 'Westlink Constructions', suburb: 'Campbelltown', address: '14 Queen St', quote: 23100, daysAgo: 890, service: 'Commercial' },

  { client: 'Hollis Constructions', suburb: 'Caringbah', address: '9 President Ave', quote: 12800, daysAgo: 520, service: 'Residential' },
  { client: 'Hollis Constructions', suburb: 'Miranda', address: '44 Kiora Rd', quote: 15650, daysAgo: 740, service: 'Residential' },
  { client: 'Hollis Constructions', suburb: 'Gymea', address: '18 Gymea Bay Rd', quote: 11250, daysAgo: 980, service: 'Residential' },
  { client: 'Hollis Constructions', suburb: 'Jannali', address: '7 Wattle Rd', quote: 9400, daysAgo: 1260, service: 'Residential' },
  { client: 'Georges River Maintenance', suburb: 'Sutherland', address: '21 East Pde', quote: 18750, daysAgo: 585, service: 'Commercial' },
  { client: 'Georges River Maintenance', suburb: 'Engadine', address: '12 Station St', quote: 13400, daysAgo: 1105, service: 'Residential' },
  { client: 'Georges River Maintenance', suburb: 'Kirrawee', address: '30 Oak Rd', quote: 12100, daysAgo: 1450, service: 'Residential' },
  { client: 'Coastal Edge Homes', suburb: 'Cronulla', address: '16 Gerrale St', quote: 20800, daysAgo: 430, service: 'Residential' },
]

const CREW = [
  { id: 'p-jake', supplier: 'Jake Moreno (historical rollup)' },
  { id: 'p-tom', supplier: 'Tom Kerrigan (historical rollup)' },
  { id: 'p-ruby', supplier: 'Ruby Chen (historical rollup)' },
] as const

const slug = (n: string) => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function ensureClient(clients: Client[], name: string, createdAt: string, createdIds: Set<string>): Client {
  const found = clients.find((c) => c.name === name)
  if (found) return found
  const meta = NEW_CLIENTS.find((c) => c.name === name)
  if (!meta) throw new Error(`geo history: unknown client ${name}`)
  const client: Client = {
    id: `cl-${slug(name)}`,
    name,
    type: meta.type,
    notes: 'Fictional demo client for the Sydney map. No real customer.',
    contacts: [],
    emailLog: [],
    reviewConsent: false,
    createdAt,
  }
  clients.push(client)
  createdIds.add(client.id)
  return client
}

function buyerFor(client: Client, seq: number) {
  const existing = client.contacts.find((c) => c.role === 'Buyer') ?? client.contacts[0]
  if (existing) return existing
  const contact = {
    id: `ct-${client.id}-1`,
    name: 'Accounts desk',
    role: 'Buyer' as const,
    phone: `0400 000 ${String(seq).padStart(3, '0')}`,
    email: `accounts.${slug(client.name)}@example.com`,
  }
  client.contacts.push(contact)
  return contact
}

export function buildGeoHistory(opts: { now: Date; year: number; startSeq: number; clients: Client[] }): { jobs: Job[]; expenses: Expense[] } {
  const createdIds = new Set<string>()
  const jobs: Job[] = []
  const expenses: Expense[] = []

  SPECS.forEach((spec, index) => {
    if (spec.daysAgo < MIN_AGE_DAYS) throw new Error(`geo history: ${spec.suburb} is too recent for the live dashboard`)
    if (!suburbByName(spec.suburb)) throw new Error(`geo history: unknown suburb ${spec.suburb}`)
    const seq = opts.startSeq + index
    const paid = new Date(opts.now.getTime() - spec.daysAgo * 86400000)
    const created = new Date(paid.getTime() - 50 * 86400000)
    const shift = (days: number) => ymd(new Date(paid.getTime() - days * 86400000))
    const client = ensureClient(opts.clients, spec.client, created.toISOString(), createdIds)
    const buyer = buyerFor(client, seq)
    const id = `job-${seq}`
    jobs.push({
      id,
      code: formatJobCode(opts.year, seq),
      seq,
      clientId: client.id,
      client: client.name,
      clientType: client.type,
      serviceType: spec.service,
      droneSurvey: !!spec.drone,
      contactName: buyer.name,
      contactPhone: buyer.phone,
      contactEmail: buyer.email,
      buyerContactId: buyer.id,
      siteAddress: spec.address,
      suburb: spec.suburb,
      stage: 'Paid',
      quote: spec.quote,
      kit: [],
      siteNotes: 'Fictional historical job for the Sydney area view. Not a real customer or address record.',
      attachments: [],
      dates: {
        approvedAt: shift(40),
        buildDate: shift(30),
        erectedAt: shift(28),
        takedownDate: shift(8),
        dismantledAt: shift(6),
        returnedAt: shift(4),
        invoicedAt: shift(2),
      },
      inspections: [],
      siteDocs: { neighbourConsent: 'not-required' },
      activity: [
        { id: `geo-act-${seq}-0`, at: created.toISOString(), kind: 'system', text: 'Enquiry created (historical demo)' },
        { id: `geo-act-${seq}-1`, at: paid.toISOString(), kind: 'stage', text: 'Stage changed: Invoiced → Paid' },
      ],
      createdAt: created.toISOString(),
      paidAt: paid.toISOString(),
    })
    const crew = CREW[index % CREW.length]
    expenses.push({
      id: `exp-geo-${seq}`,
      jobId: id,
      date: ymd(paid),
      supplier: crew.supplier,
      personId: crew.id,
      description: 'Erect and dismantle (demo rollup)',
      category: 'Subcontractor labour',
      reason: 'Historical job cost rollup (fictional)',
      amount: Math.round(spec.quote * 0.62),
    })
  })

  for (const id of createdIds) {
    const client = opts.clients.find((c) => c.id === id)
    const times = jobs.filter((j) => j.clientId === id).map((j) => j.createdAt).sort()
    if (client && times[0]) client.createdAt = times[0]
  }

  return { jobs, expenses }
}
