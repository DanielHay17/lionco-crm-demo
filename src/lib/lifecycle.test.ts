import { describe, expect, it } from 'vitest'
import { addJob, approveQuote, createQuote, declineQuote, decideVariation, addVariation, findJob, issueQuote, jobQuotes, moveJob, returnComplete, reviseQuote, setReturned, stageWarnings, updateQuote, activeQuote, nextJobSeq, peekNextCode } from './state'
import { computeQuote } from './quote'
import { buildSeed } from './seed'
import { setJobCounter } from './state'
import { STAGES, type AppState, type Job } from './types'
import { canMove, stageIndex } from './stages'
import { addInspection } from './ops'

const NOW = new Date('2026-11-05T09:00:00')
const AT = NOW.toISOString()
const input = { client: 'Fresh Client Pty', clientType: 'Builder' as const, serviceType: 'Residential' as const, droneSurvey: false, contactName: 'Buyer B', contactPhone: '0400 000 001', contactEmail: 'b@example.com', siteContactName: 'Site S', siteAddress: '1 Test St', suburb: 'Newtown', quote: 0 }

/** Invariants that must hold for every job in a coherent state. */
function assertInvariants(s: AppState) {
  const seqs = new Set<number>()
  const codes = new Set<string>()
  for (const j of s.jobs) {
    expect(seqs.has(j.seq)).toBe(false)
    expect(codes.has(j.code)).toBe(false)
    seqs.add(j.seq)
    codes.add(j.code)
    expect(s.clients.some((c) => c.id === j.clientId)).toBe(true)
    const q = j.activeQuoteId ? s.quotes.find((x) => x.id === j.activeQuoteId) : undefined
    if (j.activeQuoteId) expect(q).toBeDefined()
    if (q) {
      expect(q.jobId).toBe(j.id)
      const idx = stageIndex(j.stage)
      if (j.stage === 'Declined') expect(q.status).toBe('declined')
      else if (j.stage === 'Enquiry') expect(q.status).toBe('draft')
      else if (j.stage === 'Quote') expect(q.status).toBe('issued')
      else expect(idx >= stageIndex('Approved') && q.status === 'approved').toBe(true)
    }
    expect(Boolean(j.paidAt)).toBe(stageIndex(j.stage) >= stageIndex('Paid'))
    // dates never contradict the stage
    if (stageIndex(j.stage) < stageIndex('Erected')) expect(j.dates.erectedAt).toBeUndefined()
    if (stageIndex(j.stage) < stageIndex('Dismantled')) expect(j.dates.dismantledAt).toBeUndefined()
    if (stageIndex(j.stage) < stageIndex('Approved')) expect(j.dates.approvedAt).toBeUndefined()
  }
  expect(s.jobCounter).toBeGreaterThan(Math.max(...s.jobs.map((j) => j.seq)))
}

describe('lifecycle invariants', () => {
  it('seed state satisfies the invariants and has unique sequential demo job IDs', () => {
    const s = buildSeed(NOW)
    assertInvariants(s)
    expect(s.jobs.map((j) => j.seq)).toEqual(s.jobs.map((_, i) => i + 1))
    for (const j of s.jobs.filter((x) => x.activeQuoteId)) {
      const q = s.quotes.find((x) => x.id === j.activeQuoteId)!
      expect(computeQuote(q).sell).toBeCloseTo(j.quote, 1) // seeded quotes reproduce the existing contract values
    }
  })

  it('walks the full lifecycle enquiry → … → review and stays coherent at every step', () => {
    let s = buildSeed(NOW)
    const added = addJob(s, input, NOW)
    s = added.state
    const id = added.job.id
    // customer → job → quote
    s = { ...s, jobs: s.jobs.map((j) => (j.id === id ? { ...j, kit: [{ itemId: 'std20', qty: 6 }, { itemId: 'base', qty: 8 }, { itemId: 'plank24', qty: 4 }] } : j)) }
    const made = createQuote(s, id, AT)!
    s = made.state
    expect(made.quote.lines.some((l) => l.kind === 'kit')).toBe(true)
    assertInvariants(s)
    s = issueQuote(s, made.quote.id, AT)
    expect(findJob(s, id)!.stage).toBe('Quote')
    expect(s.syncQueue.some((x) => x.jobId === id && x.kind === 'quote-sync')).toBe(true)
    s = approveQuote(s, made.quote.id, AT)
    expect(findJob(s, id)!.stage).toBe('Approved')
    expect(s.checklists[id]).toBeDefined() // packing list generated on approval
    expect(findJob(s, id)!.dates.approvedAt).toBe('2026-11-05')
    for (const st of STAGES.slice(STAGES.indexOf('Job in progress'))) {
      s = moveJob(s, id, st, AT)
      assertInvariants(s)
      expect(findJob(s, id)!.stage).toBe(st)
    }
    const done = findJob(s, id)!
    expect(done.paidAt).toBeDefined()
    expect(done.dates.erectedAt).toBeDefined()
    expect(done.dates.invoicedAt).toBeDefined()
    expect(s.syncQueue.filter((x) => x.jobId === id && x.kind === 'invoice-draft')).toHaveLength(1)
  })

  it('declining sets the quote declined, records a reason, and can be re-opened', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Quote' && j.activeQuoteId)!
    s = declineQuote(s, job.activeQuoteId!, 'Too expensive (demo)', AT)
    let j = findJob(s, job.id)!
    expect(j.stage).toBe('Declined')
    expect(j.declinedReason).toBe('Too expensive (demo)')
    expect(activeQuote(s, j)!.status).toBe('declined')
    assertInvariants(s)
    expect(canMove('Declined', 'Paid')).toBe(false)
    expect(moveJob(s, job.id, 'Invoiced', AT)).toBe(s) // blocked
    // revise → new draft version, job back to Enquiry
    const r = reviseQuote(s, j.activeQuoteId!, AT)!
    s = r.state
    j = findJob(s, job.id)!
    expect(r.quote.version).toBe(2)
    expect(j.stage).toBe('Enquiry')
    expect(jobQuotes(s, job.id).map((q) => q.status)).toEqual(['draft', 'superseded'])
    assertInvariants(s)
    s = issueQuote(s, r.quote.id, AT)
    s = approveQuote(s, r.quote.id, AT)
    expect(findJob(s, job.id)!.stage).toBe('Approved')
    assertInvariants(s)
  })

  it('moving back before approval reverts the quote status; dates for later stages are cleared', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Erected')!
    expect(job.dates.erectedAt).toBeDefined()
    s = moveJob(s, job.id, 'Build booked', AT)
    expect(findJob(s, job.id)!.dates.erectedAt).toBeUndefined()
    s = moveJob(s, job.id, 'Quote', AT)
    expect(activeQuote(s, findJob(s, job.id)!)!.status).toBe('issued')
    assertInvariants(s)
  })

  it('quote editing is draft-only and keeps job value in sync; approval copies quote kit to the job', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Enquiry' && j.activeQuoteId)!
    const q = activeQuote(s, job)!
    expect(q.status).toBe('draft')
    const edited = { ...q, hireWeeks: q.hireWeeks + 2 }
    s = updateQuote(s, edited)
    expect(findJob(s, job.id)!.quote).toBe(computeQuote(edited).sell)
    s = issueQuote(s, q.id, AT)
    const locked = updateQuote(s, { ...edited, hireWeeks: 99 })
    expect(locked).toBe(s) // issued quotes are locked
    s = approveQuote(s, q.id, AT)
    expect(findJob(s, job.id)!.kit.length).toBeGreaterThan(0)
  })

  it('variations change contract value and kit only when approved', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Job in progress')!
    const base = job.quote
    s = addVariation(s, job.id, { description: 'Extra lift', sellDelta: 1200, costDelta: 700, kitDeltas: [{ itemId: 'plank24', qty: 4 }] }, AT)
    const v = s.variations.find((x) => x.jobId === job.id && x.status === 'proposed' && x.description === 'Extra lift')!
    expect(findJob(s, job.id)!.quote).toBe(base)
    s = decideVariation(s, v.id, 'approved', AT)
    expect(v.quoteId).toBe(job.activeQuoteId) // variation is linked to the quote it amends
    expect(findJob(s, job.id)!.quote).toBe(base + 1200)
    expect(findJob(s, job.id)!.kit.find((k) => k.itemId === 'plank24')!.qty).toBe(job.kit.find((k) => k.itemId === 'plank24')!.qty + 4)
    const v2 = addVariation(s, job.id, { description: 'Declined one', sellDelta: 500, costDelta: 0 }, AT)
    const id2 = v2.variations.at(-1)!.id
    const d = decideVariation(v2, id2, 'declined', AT)
    expect(findJob(d, job.id)!.quote).toBe(base + 1200)
    expect(decideVariation(d, id2, 'approved', AT)).toBe(d) // already decided
    // variations are not allowed pre-approval
    const enq = s.jobs.find((j) => j.stage === 'Enquiry')!
    expect(addVariation(s, enq.id, { description: 'x', sellDelta: 1, costDelta: 0 }, AT)).toBe(s)
  })

  it('job numbering is sequential, never reused, and the counter can only move forward', () => {
    let s = buildSeed(NOW)
    const max = Math.max(...s.jobs.map((j) => j.seq))
    expect(nextJobSeq(s)).toBe(max + 1)
    expect(setJobCounter(s, max)).toBe(s) // can't go back onto used numbers
    s = setJobCounter(s, max + 50)
    const a = addJob(s, input, NOW)
    expect(a.job.seq).toBe(max + 50)
    expect(peekNextCode(a.state, NOW)).toBe(`LC-2026-0${max + 51}`)
    assertInvariants(a.state)
  })

  it('client is reused by name and contacts carry buyer / site-manager roles', () => {
    let s = buildSeed(NOW)
    const before = s.clients.length
    const a = addJob(s, input, NOW)
    const b = addJob(a.state, { ...input, siteAddress: '2 Test St' }, NOW)
    s = b.state
    expect(s.clients.length).toBe(before + 1)
    expect(a.job.clientId).toBe(b.job.clientId)
    const c = s.clients.find((x) => x.id === a.job.clientId)!
    expect(c.contacts.map((x) => x.role).sort()).toEqual(['Buyer', 'Site manager'])
    expect(c.contacts).toHaveLength(2) // second job reused them
  })

  it('warehouse return completes only when every line is checked, stamping returnedAt and recording shortfalls', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.stage === 'Warehouse return')!
    const cl = () => s.checklists[job.id]
    expect(returnComplete(cl())).toBe(false)
    for (const l of cl().lines) s = setReturned(s, job.id, l.id, l.qty, AT)
    expect(returnComplete(cl())).toBe(true)
    expect(findJob(s, job.id)!.dates.returnedAt).toBe('2026-11-05')
    s = setReturned(s, job.id, cl().lines[0].id, undefined, AT)
    expect(findJob(s, job.id)!.dates.returnedAt).toBeUndefined()
  })

  it('advisory warnings flag skipped steps without blocking', () => {
    const s = buildSeed(NOW)
    const j = s.jobs.find((x) => x.stage === 'Dismantled') as Job
    expect(stageWarnings(s, j, 'Invoiced').some((w) => /return/i.test(w))).toBe(true)
    expect(moveJob(s, j.id, 'Invoiced', AT)).not.toBe(s)
  })

  it('inspection records are stored on the job', () => {
    let s = buildSeed(NOW)
    const j = s.jobs.find((x) => x.stage === 'Erected')!
    s = addInspection(s, j.id, { date: '2026-11-04', by: 'Tester', outcome: 'No issues noted', notes: '' }, AT)
    expect(findJob(s, j.id)!.inspections).toHaveLength(1)
    expect(addInspection(s, j.id, { date: 'bad', by: 'x', outcome: 'No issues noted', notes: '' }, AT)).toBe(s)
  })
})
