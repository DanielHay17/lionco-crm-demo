import { describe, expect, it } from 'vitest'
import { isBooked, clientMetrics } from './clients'
import { monthKey } from './format'
import { monthlyRevenue } from './state'
import { buildSeed } from './seed'
import { ALL_STAGES, type Job, type Stage } from './types'
import { demoSiteCoordinate, SITE_PIN_REV, withDemoSitePin } from './sitePins'
import { REGIONS, regionOf, suburbByName } from './sydneyGeo'
import { migrateState } from './migrate'
import {
  analyticsStatus,
  areaKpis,
  bubbleRadiusPx,
  filterAnalyticsJobs,
  isArchivedPaid,
  sortSuburbRows,
  statusCounts,
  suburbStats,
  type AnalyticsStatus,
} from './areaAnalytics'

const NOW = new Date('2026-11-05T09:00:00')

function job(partial: Partial<Job> & Pick<Job, 'id' | 'suburb' | 'stage' | 'quote'>): Job {
  return {
    code: partial.id,
    seq: 1,
    clientId: 'c',
    client: 'Test Co',
    clientType: 'Builder',
    serviceType: 'Residential',
    droneSurvey: false,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    siteAddress: '1 Test St',
    kit: [],
    siteNotes: '',
    attachments: [],
    dates: {},
    inspections: [],
    siteDocs: { neighbourConsent: 'not-required' },
    activity: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    ...partial,
  }
}

const sample = [
  job({ id: 'paid', suburb: 'Bondi', stage: 'Paid', quote: 10000, paidAt: '2026-03-01T00:00:00.000Z' }),
  job({ id: 'up', suburb: 'Bondi', stage: 'Erected', quote: 5000, dates: { approvedAt: '2026-08-01', erectedAt: '2026-08-10' } }),
  job({ id: 'quote', suburb: 'Bondi', stage: 'Quote', quote: 8000, createdAt: '2026-02-01T00:00:00.000Z' }),
  job({ id: 'lost', suburb: 'Parramatta', stage: 'Declined', quote: 9000, createdAt: '2026-04-01T00:00:00.000Z' }),
  job({ id: 'old', suburb: 'Manly', stage: 'Paid', quote: 4000, paidAt: '2024-01-15T00:00:00.000Z', createdAt: '2023-11-01T00:00:00.000Z' }),
]

describe('area analytics aggregation', () => {
  it('maps every stage into active, upcoming, completed or declined', () => {
    const expected: Record<Stage, AnalyticsStatus> = {
      Enquiry: 'upcoming',
      Quote: 'upcoming',
      Approved: 'upcoming',
      'Job in progress': 'active',
      'Build booked': 'active',
      Erected: 'active',
      'Takedown booked': 'active',
      Dismantled: 'active',
      'Warehouse return': 'active',
      Invoiced: 'completed',
      Paid: 'completed',
      'Google review requested': 'completed',
      Declined: 'declined',
    }
    for (const stage of ALL_STAGES) expect(analyticsStatus(stage)).toBe(expected[stage])
  })

  it('sums booked revenue per suburb and leaves quotes and declined jobs out of the dollars', () => {
    const rows = suburbStats(sample)
    const bondi = rows.find((r) => r.suburb === 'Bondi')!
    expect(bondi).toMatchObject({ jobs: 3, revenue: 15000, booked: 2, average: 7500 })
    const parra = rows.find((r) => r.suburb === 'Parramatta')!
    expect(parra).toMatchObject({ jobs: 1, revenue: 0, booked: 0, average: 0 })
    expect(rows[0].suburb).toBe('Bondi')
    const odd = suburbStats([
      job({ id: 'a', suburb: 'Manly', stage: 'Paid', quote: 10, paidAt: '2026-01-01T00:00:00.000Z' }),
      job({ id: 'b', suburb: 'Manly', stage: 'Invoiced', quote: 21, dates: { approvedAt: '2026-01-02', invoicedAt: '2026-02-02' } }),
    ])
    expect(odd[0].average).toBe(15.5)
  })

  it('counts statuses and KPIs from the same jobs', () => {
    expect(statusCounts(sample)).toEqual({ active: 1, upcoming: 1, completed: 2, declined: 1 })
    const k = areaKpis(sample)
    expect(k.revenue).toBe(19000)
    expect(k.activeJobs).toBe(1)
    expect(k.pastJobs).toBe(2)
    expect(k.topSuburb).toBe('Bondi')
    expect(k.averageJobValue).toBeCloseTo(19000 / 3, 2)
    expect(k.bookedJobs).toBe(3)
    const empty = areaKpis([])
    expect(empty).toMatchObject({ revenue: 0, activeJobs: 0, pastJobs: 0, topSuburb: null, averageJobValue: 0, bookedJobs: 0 })
  })

  it('filters by region and date range', () => {
    const all = new Set<AnalyticsStatus>(['active', 'upcoming', 'completed', 'declined'])
    const eastern = filterAnalyticsJobs(sample, { statuses: all, focus: { kind: 'region', region: 'eastern' }, range: 'all', now: NOW })
    expect(eastern.map((j) => j.id).sort()).toEqual(['paid', 'quote', 'up'])
    expect(eastern.every((j) => regionOf(j.suburb) === 'eastern')).toBe(true)
    expect(regionOf('Parramatta')).toBe('western')

    const suburb = filterAnalyticsJobs(sample, { statuses: all, focus: { kind: 'suburb', suburb: 'Manly' }, range: 'all', now: NOW })
    expect(suburb.map((j) => j.id)).toEqual(['old'])

    const thisYear = filterAnalyticsJobs(sample, { statuses: all, focus: { kind: 'all' }, range: 'this-year', now: NOW })
    expect(thisYear.map((j) => j.id).sort()).toEqual(['lost', 'paid', 'quote', 'up'])
    const lastYear = filterAnalyticsJobs(sample, { statuses: all, focus: { kind: 'all' }, range: 'last-12-months', now: NOW })
    expect(lastYear.map((j) => j.id).sort()).toEqual(['lost', 'paid', 'quote', 'up'])
    const allTime = filterAnalyticsJobs(sample, { statuses: all, focus: { kind: 'all' }, range: 'all', now: NOW })
    expect(allTime).toHaveLength(sample.length)

    const completedOnly = filterAnalyticsJobs(sample, { statuses: new Set(['completed']), focus: { kind: 'all' }, range: 'all', now: NOW })
    expect(completedOnly.every((j) => analyticsStatus(j.stage) === 'completed')).toBe(true)
    expect(areaKpis(completedOnly).activeJobs).toBe(0)
  })

  it('sorts suburb rows and scales bubbles without a zero or NaN radius', () => {
    const rows = suburbStats(sample)
    expect(sortSuburbRows(rows, 'suburb', 1).map((r) => r.suburb)).toEqual(['Bondi', 'Manly', 'Parramatta'])
    expect(sortSuburbRows(rows, 'jobs', -1)[0].suburb).toBe('Bondi')
    expect(bubbleRadiusPx(0, 100)).toBe(0)
    expect(bubbleRadiusPx(100, 0)).toBe(0)
    expect(bubbleRadiusPx(100, 100)).toBe(40)
    expect(bubbleRadiusPx(25, 100)).toBeGreaterThan(12)
    expect(bubbleRadiusPx(25, 100)).toBeLessThan(40)
  })
})

describe('Sydney seed on the analytics map', () => {
  const seed = buildSeed(NOW)

  it('has a full spread of fictional jobs, each on a known suburb', () => {
    expect(seed.jobs.length).toBeGreaterThanOrEqual(60)
    expect(seed.jobs.length).toBeLessThanOrEqual(90)
    const seen = new Map<string, string>()
    for (const j of seed.jobs) {
      const centre = suburbByName(j.suburb)
      expect(centre, j.suburb).toBeDefined()
      expect(j.sitePinRev).toBe(SITE_PIN_REV)
      expect(j.lat).toBeTypeOf('number')
      expect(j.lng).toBeTypeOf('number')
      const away = Math.hypot(j.lat! - centre!.lat, j.lng! - centre!.lng)
      expect(away, j.suburb).toBeGreaterThan(0.0022)
      const key = `${j.lat},${j.lng}`
      expect(seen.has(key)).toBe(false)
      seen.set(key, j.id)
      expect(demoSiteCoordinate(j.id, j.suburb)).toEqual({ lat: j.lat, lng: j.lng })
    }
    for (const region of REGIONS) {
      const n = seed.jobs.filter((j) => regionOf(j.suburb) === region.id).length
      expect(n, region.label).toBeGreaterThanOrEqual(4)
    }
  })

  it('keeps historical paid jobs out of the CEO 12-month window and the live book', () => {
    const months = new Set(monthlyRevenue(seed, NOW).map((m) => m.key))
    const history = seed.jobs.filter((j) => j.seq > 19)
    expect(history.length).toBeGreaterThan(0)
    for (const j of history) {
      expect(j.stage).toBe('Paid')
      expect(j.kit).toEqual([])
      expect(isArchivedPaid(j, NOW)).toBe(true)
      expect(months.has(monthKey(new Date(j.paidAt!)))).toBe(false)
    }
    for (const j of seed.jobs.filter((j) => j.seq <= 19 && j.paidAt)) expect(isArchivedPaid(j, NOW)).toBe(false)
  })

  it('migration fills precise demo pins and leaves a current pin alone', () => {
    const stripped = JSON.parse(JSON.stringify(seed)) as typeof seed
    for (const j of stripped.jobs) {
      delete j.lat
      delete j.lng
      delete j.sitePinRev
    }
    const migrated = migrateState(stripped)!
    expect(migrated.jobs.map((j) => [j.id, j.lat, j.lng, j.sitePinRev])).toEqual(seed.jobs.map((j) => [j.id, j.lat, j.lng, j.sitePinRev]))
    const again = migrateState(JSON.parse(JSON.stringify(migrated)))!
    expect(again.jobs.map((j) => [j.lat, j.lng])).toEqual(migrated.jobs.map((j) => [j.lat, j.lng]))
    const kept = withDemoSitePin({ id: 'custom', suburb: 'Bondi', lat: -33.8, lng: 151.2, sitePinRev: SITE_PIN_REV })
    expect(kept).toMatchObject({ lat: -33.8, lng: 151.2 })
    const centre = suburbByName('Bondi')!
    expect(Math.hypot(kept.lat! - centre.lat, kept.lng! - centre.lng)).toBeGreaterThan(0)
  })

  it('lines suburb revenue and client LTV up with booked jobs, including map history', () => {
    const all = new Set<AnalyticsStatus>(['active', 'upcoming', 'completed', 'declined'])
    for (const region of REGIONS) {
      const jobs = filterAnalyticsJobs(seed.jobs, { statuses: all, focus: { kind: 'region', region: region.id }, range: 'all', now: NOW })
      const stats = suburbStats(jobs)
      const booked = jobs.filter(isBooked)
      expect(stats.reduce((sum, row) => sum + row.revenue, 0)).toBeCloseTo(booked.reduce((sum, j) => sum + j.quote, 0), 2)
      expect(statusCounts(jobs).active + statusCounts(jobs).upcoming + statusCounts(jobs).completed + statusCounts(jobs).declined).toBe(jobs.length)
    }
    for (const client of seed.clients) {
      const metrics = clientMetrics(seed, client.id)
      const booked = seed.jobs.filter((j) => j.clientId === client.id && isBooked(j))
      expect(metrics.bookedCount).toBe(booked.length)
      expect(metrics.bookedLtv).toBeCloseTo(booked.reduce((sum, j) => sum + j.quote, 0), 2)
    }
    const eastern = filterAnalyticsJobs(seed.jobs, { statuses: all, focus: { kind: 'region', region: 'eastern' }, range: 'all', now: NOW })
    expect(eastern.some((j) => j.suburb === 'Parramatta')).toBe(false)
    expect(eastern.some((j) => j.suburb === 'Bondi')).toBe(true)
  })
})
