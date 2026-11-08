/**
 * Approximate suburb centres for the Analytics map. Coordinates are public suburb centres
 * (not site addresses) plus a small per-job jitter applied later. Fictional jobs only.
 */

export const REGIONS = [
  { id: 'eastern', label: 'Eastern Suburbs', center: [-33.9, 151.255] as [number, number], zoom: 12 },
  { id: 'inner-west', label: 'Inner West', center: [-33.895, 151.155] as [number, number], zoom: 13 },
  { id: 'north-shore', label: 'North Shore', center: [-33.8, 151.19] as [number, number], zoom: 12 },
  { id: 'beaches', label: 'Northern Beaches', center: [-33.74, 151.29] as [number, number], zoom: 11 },
  { id: 'hills', label: 'Hills', center: [-33.72, 150.99] as [number, number], zoom: 11 },
  { id: 'western', label: 'Western Sydney', center: [-33.82, 150.9] as [number, number], zoom: 10 },
  { id: 'sutherland', label: 'Sutherland', center: [-34.04, 151.1] as [number, number], zoom: 12 },
] as const

export type RegionId = (typeof REGIONS)[number]['id']

export interface SuburbCentre {
  name: string
  region: RegionId
  lat: number
  lng: number
}

/** Greater Sydney, wide enough for Penrith through the beaches on a phone. */
export const GREATER_SYDNEY = { center: [-33.87, 151.0] as [number, number], zoom: 9 }

export const SUBURBS: SuburbCentre[] = [
  { name: 'Bondi', region: 'eastern', lat: -33.8915, lng: 151.2767 },
  { name: 'Bondi Junction', region: 'eastern', lat: -33.8925, lng: 151.2508 },
  { name: 'Bronte', region: 'eastern', lat: -33.9033, lng: 151.2639 },
  { name: 'Coogee', region: 'eastern', lat: -33.9208, lng: 151.2556 },
  { name: 'Randwick', region: 'eastern', lat: -33.9145, lng: 151.2416 },
  { name: 'Double Bay', region: 'eastern', lat: -33.8772, lng: 151.2434 },
  { name: 'Vaucluse', region: 'eastern', lat: -33.8582, lng: 151.2764 },
  { name: 'Rose Bay', region: 'eastern', lat: -33.8742, lng: 151.2665 },
  { name: 'Woollahra', region: 'eastern', lat: -33.8878, lng: 151.2394 },
  { name: 'Paddington', region: 'eastern', lat: -33.8842, lng: 151.2266 },
  { name: 'Maroubra', region: 'eastern', lat: -33.95, lng: 151.2436 },
  { name: 'Clovelly', region: 'eastern', lat: -33.9125, lng: 151.2635 },

  { name: 'Marrickville', region: 'inner-west', lat: -33.9112, lng: 151.1554 },
  { name: 'Newtown', region: 'inner-west', lat: -33.8982, lng: 151.1796 },
  { name: 'Leichhardt', region: 'inner-west', lat: -33.8831, lng: 151.1567 },
  { name: 'Balmain', region: 'inner-west', lat: -33.8581, lng: 151.1794 },
  { name: 'Annandale', region: 'inner-west', lat: -33.8813, lng: 151.1706 },
  { name: 'Dulwich Hill', region: 'inner-west', lat: -33.9048, lng: 151.1394 },
  { name: 'Ashfield', region: 'inner-west', lat: -33.8889, lng: 151.1256 },
  { name: 'Petersham', region: 'inner-west', lat: -33.8944, lng: 151.155 },
  { name: 'Stanmore', region: 'inner-west', lat: -33.8947, lng: 151.1644 },
  { name: 'Summer Hill', region: 'inner-west', lat: -33.8914, lng: 151.1386 },

  { name: 'Chatswood', region: 'north-shore', lat: -33.7967, lng: 151.1833 },
  { name: 'Lane Cove', region: 'north-shore', lat: -33.8156, lng: 151.1664 },
  { name: 'Mosman', region: 'north-shore', lat: -33.829, lng: 151.244 },
  { name: 'Neutral Bay', region: 'north-shore', lat: -33.8336, lng: 151.2186 },
  { name: 'Cremorne', region: 'north-shore', lat: -33.8278, lng: 151.2272 },
  { name: 'Willoughby', region: 'north-shore', lat: -33.8036, lng: 151.1986 },
  { name: 'Roseville', region: 'north-shore', lat: -33.7842, lng: 151.1794 },
  { name: 'Lindfield', region: 'north-shore', lat: -33.7753, lng: 151.1692 },
  { name: 'Gordon', region: 'north-shore', lat: -33.7556, lng: 151.1542 },
  { name: 'St Leonards', region: 'north-shore', lat: -33.8231, lng: 151.1942 },

  { name: 'Manly', region: 'beaches', lat: -33.7969, lng: 151.284 },
  { name: 'Dee Why', region: 'beaches', lat: -33.7514, lng: 151.2986 },
  { name: 'Freshwater', region: 'beaches', lat: -33.7794, lng: 151.2878 },
  { name: 'Narrabeen', region: 'beaches', lat: -33.7128, lng: 151.2972 },
  { name: 'Mona Vale', region: 'beaches', lat: -33.6778, lng: 151.3031 },
  { name: 'Collaroy', region: 'beaches', lat: -33.7322, lng: 151.3014 },
  { name: 'Brookvale', region: 'beaches', lat: -33.7661, lng: 151.2706 },
  { name: 'Fairlight', region: 'beaches', lat: -33.7961, lng: 151.275 },

  { name: 'Castle Hill', region: 'hills', lat: -33.731, lng: 151.0009 },
  { name: 'Baulkham Hills', region: 'hills', lat: -33.759, lng: 150.992 },
  { name: 'Bella Vista', region: 'hills', lat: -33.7417, lng: 150.9536 },
  { name: 'Kellyville', region: 'hills', lat: -33.7103, lng: 150.9564 },
  { name: 'Rouse Hill', region: 'hills', lat: -33.6822, lng: 150.9156 },
  { name: 'Pennant Hills', region: 'hills', lat: -33.7378, lng: 151.0722 },
  { name: 'Cherrybrook', region: 'hills', lat: -33.7244, lng: 151.0456 },
  { name: 'Dural', region: 'hills', lat: -33.6833, lng: 151.0167 },

  { name: 'Parramatta', region: 'western', lat: -33.815, lng: 151.0011 },
  { name: 'Penrith', region: 'western', lat: -33.7506, lng: 150.6944 },
  { name: 'Blacktown', region: 'western', lat: -33.769, lng: 150.9063 },
  { name: 'Liverpool', region: 'western', lat: -33.92, lng: 150.9231 },
  { name: 'Bankstown', region: 'western', lat: -33.9178, lng: 151.0347 },
  { name: 'Auburn', region: 'western', lat: -33.8494, lng: 151.0331 },
  { name: 'Merrylands', region: 'western', lat: -33.8364, lng: 150.9889 },
  { name: 'Fairfield', region: 'western', lat: -33.8686, lng: 150.9564 },
  { name: 'Campbelltown', region: 'western', lat: -34.065, lng: 150.8142 },
  { name: 'Richmond', region: 'western', lat: -33.5983, lng: 150.7514 },
  { name: 'St Marys', region: 'western', lat: -33.7667, lng: 150.7747 },
  { name: 'Mount Druitt', region: 'western', lat: -33.7669, lng: 150.8194 },

  { name: 'Cronulla', region: 'sutherland', lat: -34.0556, lng: 151.1519 },
  { name: 'Caringbah', region: 'sutherland', lat: -34.0353, lng: 151.1228 },
  { name: 'Miranda', region: 'sutherland', lat: -34.0336, lng: 151.1003 },
  { name: 'Sutherland', region: 'sutherland', lat: -34.0311, lng: 151.0575 },
  { name: 'Gymea', region: 'sutherland', lat: -34.035, lng: 151.0856 },
  { name: 'Engadine', region: 'sutherland', lat: -34.0656, lng: 151.0128 },
  { name: 'Kirrawee', region: 'sutherland', lat: -34.0353, lng: 151.0717 },
  { name: 'Jannali', region: 'sutherland', lat: -34.0156, lng: 151.0608 },
]

const BY_NAME = new Map(SUBURBS.map((s) => [s.name.toLowerCase(), s]))

export function suburbByName(name: string): SuburbCentre | undefined {
  return BY_NAME.get(name.trim().toLowerCase())
}

export function regionOf(suburb: string): RegionId | null {
  return suburbByName(suburb)?.region ?? null
}

export function regionById(id: RegionId) {
  return REGIONS.find((r) => r.id === id)
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Suburb centre plus a stable offset so jobs in the same suburb do not sit on one pixel.
 * Offset is about ±700 m. Not a geocoded street address.
 */
export function jobLatLng(id: string, suburb: string): { lat: number; lng: number } | null {
  const base = suburbByName(suburb)
  if (!base) return null
  const h = hash(id)
  const lat = base.lat + ((h % 1000) / 1000 - 0.5) * 0.012
  const lng = base.lng + (((h >>> 10) % 1000) / 1000 - 0.5) * 0.014
  return { lat, lng }
}

export type AreaFocus = { kind: 'all' } | { kind: 'region'; region: RegionId } | { kind: 'suburb'; suburb: string }

/** Positions used to frame the map. One suburb zooms in; a region or the whole city fits every centre. */
export function focusPositions(focus: AreaFocus): [number, number][] {
  if (focus.kind === 'suburb') {
    const s = suburbByName(focus.suburb)
    return s ? [[s.lat, s.lng]] : [GREATER_SYDNEY.center]
  }
  const list = SUBURBS.filter((s) => focus.kind === 'all' || s.region === focus.region)
  return list.length ? list.map((s) => [s.lat, s.lng]) : [GREATER_SYDNEY.center]
}
