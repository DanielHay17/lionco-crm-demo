/**
 * Browser-only coverage map. Loaded with a dynamic import after mount so Leaflet
 * never runs during the route smoke test or on the static Cloudflare Pages HTML.
 *
 * Tiles: OpenStreetMap's standard tile servers. No API key. Leaflet asks only
 * for the tiles on screen (idle updates, a small buffer) — no prefetch or bulk download.
 * CARTO's lighter basemap now requires an API key, so it is not used here.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Marker, Pane, Polygon, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { ANALYTICS_STATUSES, bubbleRadiusPx, statusColor, type AnalyticsStatus } from '../../lib/areaAnalytics'
import { GREATER_SYDNEY } from '../../lib/sydneyGeo'
import { money } from '../../lib/format'

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

/** Rough sketch of the demo patch. Not an official boundary. */
const SYDNEY_PATCH: [number, number][] = [
  [-33.6, 150.8],
  [-33.66, 151.3],
  [-33.86, 151.34],
  [-34.09, 151.23],
  [-34.12, 150.96],
  [-33.96, 150.7],
  [-33.74, 150.6],
  [-33.6, 150.8],
]

export interface MapJobPoint {
  id: string
  code: string
  client: string
  suburb: string
  address: string
  value: number
  status: AnalyticsStatus
  stage: string
  lat: number
  lng: number
}

export interface MapBubble {
  suburb: string
  lat: number
  lng: number
  revenue: number
  jobs: number
  average: number
}

export interface SydneyMapProps {
  points: MapJobPoint[]
  bubbles: MapBubble[]
  showBubbles: boolean
  /** 'all', 'region:…' or 'suburb:…'. Changing it reframes the map. */
  focusKey: string
}

const STATUS_LABEL: Record<AnalyticsStatus, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  completed: 'Completed',
  declined: 'Declined',
}

function prefersStill() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function fitJobs(map: L.Map, points: [number, number][], maxZoom: number) {
  if (points.length === 0) {
    map.setView(GREATER_SYDNEY.center, GREATER_SYDNEY.zoom, { animate: !prefersStill() })
    return
  }
  if (points.length === 1) {
    map.flyTo(points[0], 17, { duration: prefersStill() ? 0 : 0.6 })
    return
  }
  map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom, animate: !prefersStill() })
}

function MapFrame({ points, focusKey }: { points: [number, number][]; focusKey: string }) {
  const map = useMap()
  const latest = useRef(points)
  latest.current = points
  useEffect(() => {
    if (focusKey === 'all') {
      map.setView(GREATER_SYDNEY.center, GREATER_SYDNEY.zoom, { animate: !prefersStill() })
      return
    }
    fitJobs(map, latest.current, focusKey.startsWith('suburb:') ? 16 : 13)
  }, [map, focusKey])
  return null
}

function ViewButtons({ points }: { points: [number, number][] }) {
  const map = useMap()
  const latest = useRef(points)
  latest.current = points
  useEffect(() => {
    const ctl = new L.Control({ position: 'topright' })
    ctl.onAdd = () => {
      const wrap = L.DomUtil.create('div', 'coverage-view-toggle')
      wrap.innerHTML =
        '<button type="button" data-act="sydney" data-testid="view-sydney">Sydney</button><button type="button" data-act="fit" data-testid="fit-jobs">Fit jobs</button>'
      L.DomEvent.disableClickPropagation(wrap)
      L.DomEvent.disableScrollPropagation(wrap)
      wrap.addEventListener('click', (event) => {
        const act = (event.target as HTMLElement).closest('button')?.getAttribute('data-act')
        if (act === 'sydney') map.setView(GREATER_SYDNEY.center, GREATER_SYDNEY.zoom, { animate: !prefersStill() })
        if (act === 'fit') fitJobs(map, latest.current, 16)
      })
      return wrap
    }
    ctl.addTo(map)
    return () => {
      ctl.remove()
    }
  }, [map])
  return null
}

function LegendControl() {
  const map = useMap()
  useEffect(() => {
    const ctl = new L.Control({ position: 'bottomleft' })
    ctl.onAdd = () => {
      const wrap = L.DomUtil.create('div', 'coverage-legend')
      const rows = ANALYTICS_STATUSES.map(
        (s) => `<div class="coverage-legend-row"><i style="background:${s.color}"></i><span>${s.label}</span></div>`,
      ).join('')
      wrap.innerHTML = `${rows}<div class="coverage-legend-row"><i class="coverage-legend-dash"></i><span>Demo patch</span></div>`
      L.DomEvent.disableClickPropagation(wrap)
      return wrap
    }
    ctl.addTo(map)
    return () => {
      ctl.remove()
    }
  }, [map])
  return null
}

function KeepSized() {
  const map = useMap()
  useEffect(() => {
    const fix = () => map.invalidateSize()
    const t = window.setTimeout(fix, 60)
    window.addEventListener('resize', fix)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', fix)
    }
  }, [map])
  return null
}

interface Cluster {
  lat: number
  lng: number
  points: MapJobPoint[]
}

function groupPins(points: MapJobPoint[], zoom: number): Cluster[] {
  if (zoom >= 13) return points.map((p) => ({ lat: p.lat, lng: p.lng, points: [p] }))
  const cell = zoom >= 11 ? 0.035 : 0.07
  const groups = new Map<string, MapJobPoint[]>()
  for (const p of points) {
    const key = `${Math.floor(p.lat / cell)}:${Math.floor(p.lng / cell)}`
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }
  return [...groups.values()].map((list) => ({
    lat: list.reduce((sum, p) => sum + p.lat, 0) / list.length,
    lng: list.reduce((sum, p) => sum + p.lng, 0) / list.length,
    points: list,
  }))
}

function clusterIcon(count: number) {
  return L.divIcon({
    className: 'coverage-cluster',
    html: `<span>${count}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function PinLayer({ points }: { points: MapJobPoint[] }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoomend() {
      setZoom(map.getZoom())
    },
  })
  const groups = groupPins(points, zoom)
  return (
    <Pane name="job-dots" style={{ zIndex: 460 }}>
      {groups.map((g) =>
        g.points.length > 1 ? (
          <Marker
            key={`c-${g.lat.toFixed(3)}-${g.lng.toFixed(3)}-${g.points.length}`}
            position={[g.lat, g.lng]}
            pane="job-dots"
            icon={clusterIcon(g.points.length)}
            eventHandlers={{
              click: () => map.flyTo([g.lat, g.lng], Math.min(zoom + 2, 16), { duration: prefersStill() ? 0 : 0.45 }),
            }}
          />
        ) : (
          <JobPin key={g.points[0].id} point={g.points[0]} />
        ),
      )}
    </Pane>
  )
}

function JobPin({ point }: { point: MapJobPoint }) {
  return (
    <CircleMarker
      center={[point.lat, point.lng]}
      radius={8}
      pane="job-dots"
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: statusColor(point.status),
        fillOpacity: point.status === 'declined' ? 0.7 : 1,
      }}
    >
      <Popup>
        <div className="min-w-[200px] max-w-[240px] text-sm text-slate-800">
          <div className="font-mono text-xs font-bold text-slate-700">{point.code}</div>
          <div className="font-semibold text-ink">{point.client}</div>
          <div>
            {point.address}, {point.suburb}
          </div>
          <div className="tabular mt-1 font-semibold">{money(point.value)}</div>
          <div className="text-xs text-slate-500">
            {STATUS_LABEL[point.status]} · {point.stage}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Fictional demo pin. A random spot in this suburb so the map can zoom to street level. Not a real resident, customer or job at this house.
          </p>
          <Link to={`/jobs/${point.id}`} className="mt-2 inline-flex min-h-[40px] items-center font-semibold text-[#172566]">
            Open job record
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export function SydneyMap({ points, bubbles, showBubbles, focusKey }: SydneyMapProps) {
  const maxRevenue = Math.max(0, ...bubbles.map((b) => b.revenue))
  const frame = points.map((p) => [p.lat, p.lng] as [number, number])
  return (
    <MapContainer
      center={GREATER_SYDNEY.center}
      zoom={GREATER_SYDNEY.zoom}
      minZoom={9}
      maxZoom={19}
      zoomControl={false}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        maxNativeZoom={19}
        updateWhenIdle
        keepBuffer={1}
      />
      <ZoomControl position="topleft" />
      <Polygon positions={SYDNEY_PATCH} pathOptions={{ color: '#172566', weight: 1.5, dashArray: '7 6', fillColor: '#172566', fillOpacity: 0.04 }} />
      <MapFrame points={frame} focusKey={focusKey} />
      <ViewButtons points={frame} />
      <LegendControl />
      <KeepSized />
      {showBubbles && (
        <Pane name="revenue-bubbles" style={{ zIndex: 400 }}>
          {bubbles.map((b) => (
            <CircleMarker
              key={b.suburb}
              center={[b.lat, b.lng]}
              radius={bubbleRadiusPx(b.revenue, maxRevenue)}
              pane="revenue-bubbles"
              pathOptions={{ color: '#172566', weight: 1, fillColor: '#172566', fillOpacity: 0.16 }}
            >
              <Popup>
                <div className="text-sm text-slate-800">
                  <div className="font-semibold text-ink">{b.suburb}</div>
                  <div className="mt-1 text-xs text-slate-500">Suburb total at the area centre, not a job site.</div>
                  <div className="mt-1">
                    {b.jobs} job{b.jobs === 1 ? '' : 's'} in this view
                  </div>
                  <div className="tabular font-semibold">Revenue {money(b.revenue)}</div>
                  <div className="tabular text-slate-600">Average {money(b.average)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </Pane>
      )}
      <PinLayer points={points} />
    </MapContainer>
  )
}
