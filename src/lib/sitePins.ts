/**
 * Fictional demo map pins. Each job gets a stable point inside its suburb,
 * offset from the suburb centre so it is not a centroid dot.
 * These are random demo locations for pan/zoom only. They are not geocoded
 * addresses and must not be read as a real resident, customer or worksite.
 */
import { suburbByName, type RegionId, type SuburbCentre } from './sydneyGeo'

/** Bump this to replace stored centroid-era pins on the next load. */
export const SITE_PIN_REV = 1

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface Pocket {
  south: number
  north: number
  west: number
  east: number
}

/** A small on-land box near the suburb, shifted off the published centre. */
function pocketFor(s: SuburbCentre): Pocket {
  const coastal = s.region === 'eastern' || s.region === 'beaches' || (s.region === 'sutherland' && s.lng > 151.12)
  const shift = shiftFor(s.region, coastal)
  const lat = s.lat + shift.dLat
  const lng = s.lng + shift.dLng
  return {
    south: lat - shift.halfLat,
    north: lat + shift.halfLat,
    west: lng - shift.halfLng,
    east: lng + shift.halfLng,
  }
}

function shiftFor(region: RegionId, coastal: boolean) {
  // Eastern and northern beaches: step inland, off the sand and the coastal parks.
  if (region === 'eastern' || region === 'beaches') return { dLat: 0.001, dLng: -0.009, halfLat: 0.0014, halfLng: 0.0015 }
  // Cronulla sits on a narrow peninsula. Stay on the same longitude and step north, off the beach.
  if (coastal) return { dLat: 0.006, dLng: 0, halfLat: 0.001, halfLng: 0.0011 }
  if (region === 'hills') return { dLat: 0.0045, dLng: 0.004, halfLat: 0.0022, halfLng: 0.0024 }
  if (region === 'western') return { dLat: -0.004, dLng: 0.005, halfLat: 0.0024, halfLng: 0.0026 }
  return { dLat: -0.0045, dLng: 0.0045, halfLat: 0.0022, halfLng: 0.0024 }
}

/** Six-decimal pin (~0.1 m) inside the suburb pocket. Null when the suburb is unknown. */
export function demoSiteCoordinate(id: string, suburb: string): { lat: number; lng: number } | null {
  const base = suburbByName(suburb)
  if (!base) return null
  const box = pocketFor(base)
  const h = hash(`${id}:demo-site`)
  const u = (h % 10000) / 10000
  const v = ((h >>> 13) % 10000) / 10000
  const lat = box.south + (0.12 + u * 0.76) * (box.north - box.south)
  const lng = box.west + (0.12 + v * 0.76) * (box.east - box.west)
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}

type Pinned = { id: string; suburb: string; lat?: number; lng?: number; sitePinRev?: number }

/**
 * Writes the current demo pin onto a job that does not already have this revision.
 * Jobs saved before precise pins (no sitePinRev) are replaced, so suburb-centre dots do not linger.
 * A pin already at this revision is left alone.
 */
export function withDemoSitePin<T extends Pinned>(job: T): T {
  if (job.sitePinRev === SITE_PIN_REV && Number.isFinite(job.lat) && Number.isFinite(job.lng)) return job
  const pin = demoSiteCoordinate(job.id, job.suburb)
  if (!pin) return job.sitePinRev === SITE_PIN_REV ? job : { ...job, sitePinRev: SITE_PIN_REV }
  return { ...job, lat: pin.lat, lng: pin.lng, sitePinRev: SITE_PIN_REV }
}
