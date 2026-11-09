import { describe, expect, it } from 'vitest'
import { checklistBalance, checklistProgress } from './checklist'
import { buildSeed } from './seed'
import { ALL_STAGES } from './types'
import {
  addExpense,
  addJob,
  jobFinancials,
  monthlyRevenue,
  moveJob,
  regenerateChecklist,
  setLineZone,
  toggleLine,
  validateExpense,
  type ExpenseInput,
} from './state'

const NOW = new Date('2026-11-05T09:00:00')
const AT = NOW.toISOString()

describe('app state transitions', () => {
  it('seed covers all stages and has loss + thin jobs and a flagged checklist', () => {
    const s = buildSeed(NOW)
    // every lifecycle stage (12 main-path stages + Declined) is represented in the seed
    expect(new Set(s.jobs.map((j) => j.stage)).size).toBe(ALL_STAGES.length)
    const margins = s.jobs.map((j) => jobFinancials(s, j))
    expect(margins.some((f) => f.profit < 0)).toBe(true)
    expect(margins.some((f) => f.cogs > 0 && f.marginPct >= 0 && f.marginPct < 20)).toBe(true)
    expect(Object.values(s.checklists).some((c) => checklistBalance(c).status === 'warning')).toBe(true)
  })

  it('seed spreads jobs across service types with drone add-ons', () => {
    const s = buildSeed(NOW)
    const types = new Set(s.jobs.map((j) => j.serviceType))
    expect(types).toContain('Residential')
    expect(types).toContain('Commercial')
    expect(s.jobs.filter((j) => j.droneSurvey).length).toBeGreaterThanOrEqual(2)
  })

  it('moving to Approved generates a checklist once and does not clobber ticks', () => {
    let s = buildSeed(NOW)
    const quoteJob = s.jobs.find((j) => j.stage === 'Quote' && j.kit.length)!
    expect(s.checklists[quoteJob.id]).toBeUndefined()
    s = moveJob(s, quoteJob.id, 'Approved', AT)
    const cl = s.checklists[quoteJob.id]
    expect(cl.lines.length).toBeGreaterThan(0)
    s = toggleLine(s, quoteJob.id, cl.lines[0].id)
    s = moveJob(s, quoteJob.id, 'Quote', AT)
    s = moveJob(s, quoteJob.id, 'Approved', AT)
    expect(checklistProgress(s.checklists[quoteJob.id]).done).toBe(1)
    s = regenerateChecklist(s, quoteJob.id, AT)
    expect(checklistProgress(s.checklists[quoteJob.id]).done).toBe(0)
  })

  it('logs stage changes and sets paidAt', () => {
    let s = buildSeed(NOW)
    const j = s.jobs.find((x) => x.stage === 'Invoiced')!
    s = moveJob(s, j.id, 'Paid', AT)
    const after = s.jobs.find((x) => x.id === j.id)!
    expect(after.paidAt).toBe(AT)
    expect(after.activity.at(-1)?.text).toContain('Invoiced → Paid')
    expect(monthlyRevenue(s, NOW).at(-1)!.revenue).toBeGreaterThanOrEqual(j.quote)
  })

  it('changing a zone recalculates balance', () => {
    let s = buildSeed(NOW)
    const id = s.jobs.find((j) => j.stage === 'Approved' && s.checklists[j.id] && checklistBalance(s.checklists[j.id]).status === 'ok')!.id
    const before = checklistBalance(s.checklists[id])
    for (const l of [...s.checklists[id].lines]) s = setLineZone(s, id, l.id, 'FL')
    expect(checklistBalance(s.checklists[id]).status).toBe('warning')
    expect(checklistBalance(s.checklists[id]).totalKg).toBeCloseTo(before.totalKg)
  })

  it('expenses require a real job and roll into profit', () => {
    let s = buildSeed(NOW)
    const job = s.jobs.find((j) => j.code.endsWith('007'))!
    const base = jobFinancials(s, job)
    const input: ExpenseInput = { jobId: job.id, date: '2026-11-05', supplier: 'Test', personId: 'p-paul', description: 'x', category: 'Fuel', reason: '', amount: 100 }
    expect(validateExpense(s, { ...input, jobId: '' }).jobId).toBeDefined()
    expect(validateExpense(s, { ...input, jobId: 'Brook Street' }).jobId).toBeDefined()
    expect(addExpense(s, { ...input, jobId: '' }, AT)).toBe(s)
    s = addExpense(s, input, AT)
    expect(jobFinancials(s, job).profit).toBe(base.profit - 100)
  })

  it('new jobs get sequential fixed codes', () => {
    let s = buildSeed(NOW)
    const base = { client: 'A', clientType: 'Builder' as const, serviceType: 'Residential' as const, droneSurvey: false, contactName: '', contactPhone: '', contactEmail: '', siteAddress: '1 X St', suburb: 'Y', quote: 1000 }
    const n = s.jobs.length
    const a = addJob(s, base, NOW)
    s = a.state
    const b = addJob(s, base, NOW)
    expect(a.job.code).toBe(`LC-2026-0${n + 1}`)
    expect(b.job.code).toBe(`LC-2026-0${n + 2}`)
    expect(a.job.stage).toBe('Enquiry')
  })
})
