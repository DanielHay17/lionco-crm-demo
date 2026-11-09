import { describe, expect, it } from 'vitest'
import { clientMetrics, isQuotedOpen } from './clients'
import { buildSeed } from './seed'
import { addClient, addJob, approveQuote, createQuote, declineQuote, findJob, issueQuote } from './state'
import { suburbRevenue } from './analytics'
import { filterMapJobs, jobPoint } from './mapgeo'
import { MAP_GROUPS } from './stages'
import { kitShortages, reservedByItem, stockRows } from './inventory'
import { inspectionStatus } from './inspection'
import { updateKitItem } from './ops'

const NOW = new Date('2026-11-05T09:00:00')
const AT = NOW.toISOString()
const jobInput = { client: 'X', clientType: 'Builder' as const, serviceType: 'Residential' as const, droneSurvey: false, contactName: '', contactPhone: '', contactEmail: '', siteAddress: '1 A St', suburb: 'Bondi', quote: 5000 }

describe('client LTV / average ticket', () => {
  it('a client with no jobs has zero LTV and zero average (no NaN)', () => {
    const r = addClient(buildSeed(NOW), { name: 'No Jobs Ltd', type: 'Builder' }, AT)
    const m = clientMetrics(r.state, r.client.id)
    expect(m).toMatchObject({ bookedLtv: 0, paidLtv: 0, avgTicket: 0, bookedCount: 0, quotedOpen: 0, declinedCount: 0 })
    expect(m.current).toEqual([])
  })

  it('excludes enquiries, draft quotes and declined quotes from LTV; open quotes shown separately', () => {
    let s = buildSeed(NOW)
    const mk = (addr: string, quote: number) => {
      const r = addJob(s, { ...jobInput, quote, siteAddress: addr }, NOW)
      s = { ...r.state, jobs: r.state.jobs.map((j) => (j.id === r.job.id ? { ...j, kit: [{ itemId: 'std20', qty: 4 }] } : j)) }
      const q = createQuote(s, r.job.id, AT)!
      s = q.state
      return { job: r.job, quote: q.quote }
    }
    const draft = mk('1 A St', 5000)
    const cid = draft.job.clientId
    const m0 = clientMetrics(s, cid)
    expect(m0).toMatchObject({ bookedLtv: 0, quotedOpen: 0 }) // enquiry + draft quote: nothing counted
    expect(isQuotedOpen(s, findJob(s, draft.job.id)!)).toBe(false)

    const issued = mk('2 A St', 7000)
    s = issueQuote(s, issued.quote.id, AT)
    const issuedValue = findJob(s, issued.job.id)!.quote
    expect(clientMetrics(s, cid).quotedOpen).toBe(issuedValue)
    expect(clientMetrics(s, cid).bookedLtv).toBe(0)

    const lost = mk('3 A St', 9000)
    s = issueQuote(s, lost.quote.id, AT)
    s = declineQuote(s, lost.quote.id, 'no', AT)
    expect(clientMetrics(s, cid)).toMatchObject({ declinedCount: 1, bookedLtv: 0, quotedOpen: issuedValue })

    s = approveQuote(s, issued.quote.id, AT)
    const m = clientMetrics(s, cid)
    expect(m).toMatchObject({ bookedCount: 1, quotedOpen: 0, paidLtv: 0 })
    expect(m.bookedLtv).toBe(issuedValue)
    expect(m.avgTicket).toBe(issuedValue)
  })

  it('seed: Pinnacle (declined only) has zero LTV; Harbourline averages are booked ÷ count', () => {
    const s = buildSeed(NOW)
    const pin = s.clients.find((c) => c.name.startsWith('Pinnacle'))!
    const m = clientMetrics(s, pin.id)
    expect(m.declinedCount).toBe(1)
    expect(m.bookedLtv).toBe(0) // the only booked-ish job is an enquiry + a declined quote
    expect(m.avgTicket).toBe(0)
    const harb = s.clients.find((c) => c.name.startsWith('Harbourline'))!
    const h = clientMetrics(s, harb.id)
    const booked = s.jobs.filter((j) => j.clientId === harb.id)
    expect(h.bookedCount).toBe(booked.length)
    expect(h.bookedLtv).toBe(booked.reduce((a, j) => a + j.quote, 0))
    expect(h.avgTicket).toBeCloseTo(h.bookedLtv / h.bookedCount, 2)
    expect(h.paidLtv).toBeLessThanOrEqual(h.bookedLtv)
    expect(h.past.length + h.current.length).toBe(booked.length)
  })

  it('quoted-open counts only issued quotes at the Quote stage', () => {
    const s = buildSeed(NOW)
    const southern = s.clients.find((c) => c.name.startsWith('Southern'))!
    const m = clientMetrics(s, southern.id)
    expect(m.quotedOpen).toBe(58000)
    expect(m.bookedLtv).toBe(0)
    // a draft quote on an Enquiry job is not counted
    const kov = s.clients.find((c) => c.name.startsWith('Kovac'))!
    expect(clientMetrics(s, kov.id).quotedOpen).toBe(0)
  })

  it('declining and approving move value between quoted / booked treatment', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Quote' && j.quote === 6400)!
    const before = clientMetrics(s, job.clientId)
    expect(before.quotedOpen).toBe(6400)
    const approved = approveQuote(s, job.activeQuoteId!, AT)
    expect(clientMetrics(approved, job.clientId)).toMatchObject({ quotedOpen: 0, bookedLtv: 6400, avgTicket: 6400, paidLtv: 0 })
    const declined = declineQuote(s, job.activeQuoteId!, 'x', AT)
    expect(clientMetrics(declined, job.clientId)).toMatchObject({ quotedOpen: 0, bookedLtv: 0, declinedCount: 1 })
  })
})

describe('stock / availability', () => {
  it('reserves kit from Approved until warehouse return, and flags a shortage for the big quoted job', () => {
    const s = buildSeed(NOW)
    const res = reservedByItem(s)
    const approved = s.jobs.find((j) => j.stage === 'Approved')!
    expect(res.get(approved.kit[0].itemId)).toBeGreaterThanOrEqual(approved.kit[0].qty)
    // quote-stage / enquiry / declined / invoiced kit is NOT reserved
    const declinedJob = s.jobs.find((j) => j.stage === 'Declined')!
    const only = reservedByItem({ ...s, jobs: [declinedJob] })
    expect(only.size).toBe(0)
    const big = s.jobs.find((j) => j.quote === 58000)!
    const short = kitShortages(s, big.kit, big.id)
    expect(short.length).toBeGreaterThan(0)
    expect(short.every((x) => x.short > 0)).toBe(true)
    expect(stockRows(s).every((r) => r.available === r.owned - r.reserved)).toBe(true)
    expect(stockRows(s).some((r) => r.shortage > 0)).toBe(false) // existing commitments are fully covered
  })

  it('editing owned quantity changes availability; invalid edits are ignored', () => {
    let s = buildSeed(NOW)
    const row = stockRows(s).find((r) => r.reserved > 0)!
    const s2 = updateKitItem(s, row.item.id, { ownedQty: row.reserved - 1 })
    expect(stockRows(s2).find((r) => r.item.id === row.item.id)!.shortage).toBe(1)
    s = updateKitItem(s, row.item.id, { ownedQty: -5, weeklyRentalPrice: NaN, unitWeightKg: 0 })
    expect(s.catalogue.find((c) => c.id === row.item.id)).toEqual(row.item)
  })
})

describe('inspection reminder (configurable demo)', () => {
  const s = buildSeed(NOW)
  const today = '2026-11-05'
  it('due soon / overdue / n-a / disabled', () => {
    const parkview = s.jobs.find((j) => j.stage === 'Erected')!
    const st = inspectionStatus(parkview, 30, today)
    expect(st.state).toBe('due-soon')
    expect(st.basis).toBe('erected')
    const coastal = s.jobs.find((j) => j.stage === 'Takedown booked')!
    const od = inspectionStatus(coastal, 30, today)
    expect(od.state).toBe('overdue')
    expect(od.daysLeft!).toBeLessThan(0)
    expect(od.basis).toBe('last inspection')
    expect(inspectionStatus(coastal, 90, today).state).toBe('ok') // interval is configurable
    expect(inspectionStatus(coastal, 0, today).state).toBe('disabled')
    expect(inspectionStatus(coastal, NaN, today).state).toBe('disabled')
    expect(inspectionStatus(s.jobs.find((j) => j.stage === 'Paid')!, 30, today).state).toBe('not-applicable')
  })
})

describe('map & suburb analytics', () => {
  const s = buildSeed(NOW)
  it('places every job deterministically; unknown suburbs go to the unplaced strip', () => {
    const j = s.jobs[0]
    expect(jobPoint(j)).toEqual(jobPoint(j))
    expect(jobPoint(j).unplaced).toBe(false)
    expect(jobPoint({ id: 'zz', suburb: 'Nowhereville' }).unplaced).toBe(true)
  })
  it('filters by stage group, suburb and client', () => {
    const all = new Set(MAP_GROUPS.map((g) => g.id))
    expect(filterMapJobs(s.jobs, { groups: all, suburb: '' })).toHaveLength(s.jobs.length)
    const erected = filterMapJobs(s.jobs, { groups: new Set(['erected' as const]), suburb: '' })
    expect(erected.every((j) => j.stage === 'Erected')).toBe(true)
    const c = s.clients.find((x) => x.name.startsWith('Hollis'))!
    expect(filterMapJobs(s.jobs, { groups: all, suburb: '', clientId: c.id }).every((j) => j.clientId === c.id)).toBe(true)
  })
  it('suburb revenue excludes declined/unapproved jobs and respects date filters', () => {
    const rows = suburbRevenue(s, { basis: 'booked' })
    const total = rows.reduce((a, r) => a + r.revenue, 0)
    expect(total).toBe(s.jobs.filter((j) => j.stage !== 'Declined' && !['Enquiry', 'Quote'].includes(j.stage)).reduce((a, j) => a + j.quote, 0))
    expect(suburbRevenue(s, { basis: 'booked', from: '2099-01-01' })).toEqual([])
    expect(suburbRevenue(s, { basis: 'paid' }).reduce((a, r) => a + r.jobs, 0)).toBe(s.jobs.filter((j) => j.paidAt).length)
  })
})
