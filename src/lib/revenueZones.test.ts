import { describe, expect, it } from 'vitest'
import { buildSeed } from './seed'
import { isBooked } from './clients'
import { areaKpis } from './areaAnalytics'
import { POSTAL_AREAS, postalAreaAt, revenueByPostalArea, revenueShade } from './revenueZones'

const NOW = new Date('2026-11-05T09:00:00')

describe('postal-area revenue', () => {
  const seed = buildSeed(NOW)

  it('places every seeded demo pin in a Greater Sydney postal area', () => {
    const missing = seed.jobs.filter((job) => job.lat != null && job.lng != null && !postalAreaAt(job.lng, job.lat))
    expect(missing.map((job) => job.suburb)).toEqual([])
  })

  it('sums booked revenue inside a postal area and leaves quotes and declined jobs out of the dollars', () => {
    const rows = revenueByPostalArea(seed.jobs)
    const total = rows.reduce((sum, row) => sum + row.revenue, 0)
    const booked = seed.jobs.filter(isBooked).reduce((sum, job) => sum + job.quote, 0)
    expect(total).toBeCloseTo(booked, 2)
    expect(rows.reduce((sum, row) => sum + row.jobs, 0)).toBe(seed.jobs.length)
    expect(areaKpis(seed.jobs).revenue).toBeCloseTo(total, 2)
    for (const row of rows) {
      expect(row.revenue).toBeGreaterThan(0)
      expect(row.name).toBe(row.code)
      expect(POSTAL_AREAS.some((area) => area.code === row.code)).toBe(true)
    }
  })

  it('follows the same filters as the rest of Analytics', () => {
    const bondi = seed.jobs.filter((job) => job.suburb === 'Bondi')
    const rows = revenueByPostalArea(bondi)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.reduce((sum, row) => sum + row.jobs, 0)).toBe(bondi.length)
    const booked = bondi.filter(isBooked)
    expect(rows.reduce((sum, row) => sum + row.revenue, 0)).toBeCloseTo(booked.reduce((sum, job) => sum + job.quote, 0), 2)
    expect(revenueByPostalArea([])).toEqual([])
  })

  it('does not count a job twice when postal areas meet', () => {
    const job = seed.jobs.find((item) => item.lat != null && item.lng != null)!
    const rows = revenueByPostalArea([job, job])
    expect(rows.reduce((sum, row) => sum + row.jobs, 0)).toBe(2)
    expect(new Set(rows.map((row) => row.code)).size).toBe(1)
  })

  it('keeps the heat scale light at zero and darkest at the maximum', () => {
    expect(revenueShade(0, 100)).toBe('#e8eef6')
    expect(revenueShade(100, 0)).toBe('#e8eef6')
    expect(revenueShade(100, 100)).toBe('rgb(23,37,102)')
    const mid = revenueShade(25, 100)
    expect(mid).not.toBe(revenueShade(100, 100))
    expect(mid).not.toBe('#e8eef6')
  })
})
