import { describe, expect, it } from 'vitest'
import { migrateState, DEFAULT_SETTINGS } from './migrate'
import { buildSeed } from './seed'
import { loadState, saveState, STORAGE_KEY } from './storage'
import type { AppState } from './types'

const NOW = new Date('2026-11-05T09:00:00')

/** Shape of an MVP (v1) persisted document: none of the v2 fields exist. */
function v1Doc(): unknown {
  const s = buildSeed(NOW)
  return {
    version: 1,
    jobs: s.jobs.slice(0, 6).map((j) => {
      const { seq, clientId, buyerContactId, siteContactId, activeQuoteId, siteNotes, attachments, dates, inspections, siteDocs, declinedReason, ...legacy } = j
      void seq, clientId, buyerContactId, siteContactId, activeQuoteId, siteNotes, attachments, dates, inspections, siteDocs, declinedReason
      return legacy
    }),
    expenses: s.expenses,
    checklists: {},
    catalogue: s.catalogue.map(({ ownedQty, weeklyRentalPrice, weeklyCost, labourHoursPerUnit, ...legacy }) => {
      void ownedQty, weeklyRentalPrice, weeklyCost, labourHoursPerUnit
      return legacy
    }),
    people: s.people,
    revenueHistory: s.revenueHistory,
    monthlyTarget: 55000,
  }
}

describe('persisted-state migration', () => {
  it('upgrades a v1 (MVP) document without losing jobs, expenses or values', () => {
    const doc = v1Doc() as { jobs: { id: string; quote: number; code: string; client: string; contactName: string }[]; expenses: unknown[] }
    const m = migrateState(doc)!
    expect(m).not.toBeNull()
    expect(m.version).toBe(2)
    expect(m.jobs.map((j) => j.id)).toEqual(doc.jobs.map((j) => j.id))
    expect(m.jobs.map((j) => j.quote)).toEqual(doc.jobs.map((j) => j.quote))
    expect(m.jobs.map((j) => j.code)).toEqual(doc.jobs.map((j) => j.code))
    expect(m.expenses).toHaveLength(doc.expenses.length)
    // new structures exist with safe defaults
    expect(m.quotes).toEqual([])
    expect(m.variations).toEqual([])
    expect(m.settings).toEqual(DEFAULT_SETTINGS)
    expect(m.syncQueue).toEqual([])
    expect(m.migrationChecklist.length).toBeGreaterThan(0)
    for (const j of m.jobs) {
      expect(j.attachments).toEqual([])
      expect(j.inspections).toEqual([])
      expect(j.dates).toEqual({})
      expect(j.siteDocs.neighbourConsent).toBe('not-required')
      expect(m.clients.some((c) => c.id === j.clientId && c.name === j.client)).toBe(true)
    }
    // contacts become buyer-role contacts linked by id
    const j0 = m.jobs[0]
    const buyer = m.clients.find((c) => c.id === j0.clientId)!.contacts.find((c) => c.id === j0.buyerContactId)!
    expect(buyer.role).toBe('Buyer')
    expect(buyer.name).toBe(j0.contactName)
    // every catalogue item gets pricing / stock defaults
    for (const c of m.catalogue) {
      expect(c.ownedQty).toBeGreaterThan(0)
      expect(c.weeklyRentalPrice).toBeGreaterThan(0)
      expect(c.labourHoursPerUnit).toBeGreaterThan(0)
    }
    // the job counter continues after the highest existing sequence
    expect(m.jobCounter).toBe(Math.max(...m.jobs.map((j) => j.seq)) + 1)
    expect(new Set(m.jobs.map((j) => j.seq)).size).toBe(m.jobs.length)
  })

  it('groups jobs of the same client name into one client', () => {
    const doc = v1Doc() as { jobs: { client: string }[] }
    doc.jobs[1].client = doc.jobs[0].client
    const m = migrateState(doc)!
    expect(m.jobs[0].clientId).toBe(m.jobs[1].clientId)
  })

  it('is idempotent and leaves a current v2 state intact', () => {
    const seed = buildSeed(NOW)
    const once = migrateState(JSON.parse(JSON.stringify(seed)))!
    expect(once).toEqual(seed)
    const v1 = migrateState(v1Doc())!
    expect(migrateState(JSON.parse(JSON.stringify(v1)))).toEqual(v1)
  })

  it('rejects unusable documents instead of crashing', () => {
    for (const bad of [null, undefined, 42, 'x', {}, { version: 3 }, { version: 1, jobs: 'no' }, { version: 2, jobs: [], expenses: [], catalogue: [], people: [], checklists: null }]) {
      expect(migrateState(bad)).toBeNull()
    }
  })

  it('repairs unknown stages and missing arrays on individual jobs', () => {
    const doc = v1Doc() as { jobs: Record<string, unknown>[] }
    doc.jobs[0].stage = 'Mystery'
    delete doc.jobs[0].activity
    delete doc.jobs[0].kit
    const m = migrateState(doc)!
    expect(m.jobs[0].stage).toBe('Enquiry')
    expect(m.jobs[0].activity).toEqual([])
    expect(m.jobs[0].kit).toEqual([])
  })

  it('loadState/saveState round-trip through localStorage and migrate stored v1 data', () => {
    const store = new Map<string, string>()
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    ;(globalThis as { localStorage?: unknown }).localStorage = ls
    store.set(STORAGE_KEY, JSON.stringify(v1Doc()))
    const loaded = loadState() as AppState
    expect(loaded.version).toBe(2)
    saveState(loaded)
    expect(loadState()).toEqual(loaded)
    store.set(STORAGE_KEY, '{not json')
    expect(loadState()).toBeNull()
    delete (globalThis as { localStorage?: unknown }).localStorage
  })
})
