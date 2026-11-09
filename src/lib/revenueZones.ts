/**
 * Booked revenue by ABS Postal Area (an approximation of a postcode).
 * Shapes live in src/data/poa-sydney-2021.json. They are not Australia Post boundaries.
 */
import areas from '../data/poa-sydney-2021.json'
import { isBooked } from './clients'
import { round2 } from './profit'
import type { Job } from './types'

type Ring = [number, number][]
type PolygonCoords = Ring[]

interface PoaFeature {
  type: 'Feature'
  properties: { code: string; name: string }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: PolygonCoords | PolygonCoords[] }
}

export interface PostalArea {
  code: string
  name: string
  /** [lng, lat] rings. First ring is the outer edge. */
  polygons: Ring[][]
  lat: number
  lng: number
}

export interface ZoneRevenue {
  code: string
  name: string
  lat: number
  lng: number
  /** Jobs in the current filter whose pin falls in this postal area. */
  jobs: number
  /** Approved-or-later jobs. Same rule as suburb revenue and client booked LTV. */
  booked: number
  revenue: number
  average: number
}

const FEATURES = (areas as unknown as { features: PoaFeature[] }).features

function ringCentroid(ring: Ring): { lng: number; lat: number } {
  let lng = 0
  let lat = 0
  const n = Math.max(1, ring.length - (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0))
  for (let i = 0; i < n; i++) {
    lng += ring[i][0]
    lat += ring[i][1]
  }
  return { lng: lng / n, lat: lat / n }
}

function toPolygons(geometry: PoaFeature['geometry']): Ring[][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as PolygonCoords]
  return geometry.coordinates as PolygonCoords[]
}

export const POSTAL_AREAS: PostalArea[] = FEATURES.map((feature) => {
  const polygons = toPolygons(feature.geometry)
  const outer = polygons.map((p) => p[0]).sort((a, b) => b.length - a.length)[0]
  const c = ringCentroid(outer)
  return {
    code: feature.properties.code,
    name: feature.properties.name,
    polygons,
    lng: Math.round(c.lng * 1e5) / 1e5,
    lat: Math.round(c.lat * 1e5) / 1e5,
  }
})

const BY_CODE = new Map(POSTAL_AREAS.map((area) => [area.code, area]))

function ringContains(ring: Ring, lng: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const crosses = (yi > lat) !== (yj > lat)
    if (crosses && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function polygonContains(rings: Ring[], lng: number, lat: number): boolean {
  if (!rings.length || !ringContains(rings[0], lng, lat)) return false
  for (let hole = 1; hole < rings.length; hole++) {
    if (ringContains(rings[hole], lng, lat)) return false
  }
  return true
}

function nearestArea(lng: number, lat: number): PostalArea | null {
  let best: PostalArea | null = null
  let bestD = 0.03 * 0.03
  for (const area of POSTAL_AREAS) {
    const d = (area.lng - lng) ** 2 + (area.lat - lat) ** 2
    if (d < bestD) {
      best = area
      bestD = d
    }
  }
  return best
}

/** The postal area containing the point, or the nearest one within about 3 km if a simplified edge misses it. */
export function postalAreaAt(lng: number, lat: number): PostalArea | null {
  for (const area of POSTAL_AREAS) {
    if (area.polygons.some((rings) => polygonContains(rings, lng, lat))) return area
  }
  return nearestArea(lng, lat)
}

/** Fill colour for a booked-revenue choropleth. Zero is a light neutral, not a fake hot colour. */
export function revenueShade(revenue: number, max: number): string {
  if (max <= 0 || revenue <= 0) return '#e8eef6'
  const t = Math.sqrt(Math.min(1, revenue / max))
  const mix = (from: number, to: number) => Math.round(from + (to - from) * t)
  return `rgb(${mix(232, 23)},${mix(238, 37)},${mix(246, 102)})`
}

/**
 * Revenue and job counts for the jobs passed in (already filtered by status, date and focus).
 * A pin that a simplified edge misses is counted in the nearest postal area within about 3 km.
 */
export function revenueByPostalArea(jobs: Pick<Job, 'lat' | 'lng' | 'quote' | 'stage'>[]): ZoneRevenue[] {
  const rows = new Map<string, ZoneRevenue>()
  for (const job of jobs) {
    if (!Number.isFinite(job.lat) || !Number.isFinite(job.lng)) continue
    const area = postalAreaAt(job.lng!, job.lat!)
    if (!area) continue
    const row = rows.get(area.code) ?? {
      code: area.code,
      name: area.name,
      lat: area.lat,
      lng: area.lng,
      jobs: 0,
      booked: 0,
      revenue: 0,
      average: 0,
    }
    row.jobs += 1
    if (isBooked(job as Job)) {
      row.booked += 1
      row.revenue = round2(row.revenue + job.quote)
    }
    rows.set(area.code, row)
  }
  for (const row of rows.values()) row.average = row.booked ? round2(row.revenue / row.booked) : 0
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue || a.code.localeCompare(b.code))
}

export function postalAreaByCode(code: string): PostalArea | undefined {
  return BY_CODE.get(code)
}
