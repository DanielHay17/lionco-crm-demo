/**
 * Browser-only map. Import this module from a dynamic import() inside useEffect.
 * Leaflet touches `window` as soon as it loads, so it must not be in the server render path
 * (the route smoke test) or the initial Vite bundle that Cloudflare Pages serves as a static SPA.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Pane, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { statusColor, bubbleRadiusPx, type AnalyticsStatus } from '../../lib/areaAnalytics'
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

export interface MapJobPoint {
  id: string
  code: string
  client: string
  suburb: string
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
  /** Suburb centres to fit. A single position zooms to that suburb. */
  frame: [number, number][]
}

const STATUS_LABEL: Record<AnalyticsStatus, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  completed: 'Completed',
  declined: 'Declined',
}

function frameKey(frame: [number, number][]) {
  return frame.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|')
}

function FrameMap({ frame }: { frame: [number, number][] }) {
  const map = useMap()
  const key = frameKey(frame)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = !reduce
    if (frame.length <= 1) {
      const target = frame[0] ?? GREATER_SYDNEY.center
      map.flyTo(target, frame.length === 1 ? 14 : GREATER_SYDNEY.zoom, { duration: animate ? 0.7 : 0 })
      return
    }
    map.fitBounds(L.latLngBounds(frame), { padding: [28, 28], maxZoom: 13, animate })
  }, [map, key, frame])
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

export function SydneyMap({ points, bubbles, showBubbles, frame }: SydneyMapProps) {
  const maxRevenue = Math.max(0, ...bubbles.map((b) => b.revenue))
  return (
    <MapContainer
      center={GREATER_SYDNEY.center}
      zoom={GREATER_SYDNEY.zoom}
      zoomControl={false}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <FrameMap frame={frame} />
      <KeepSized />
      {showBubbles && (
        <Pane name="revenue-bubbles" style={{ zIndex: 410 }}>
          {bubbles.map((b) => (
            <CircleMarker
              key={b.suburb}
              center={[b.lat, b.lng]}
              radius={bubbleRadiusPx(b.revenue, maxRevenue)}
              pane="revenue-bubbles"
              pathOptions={{ color: '#172566', weight: 1, fillColor: '#172566', fillOpacity: 0.22 }}
            >
              <Popup>
                <div className="text-sm text-slate-800">
                  <div className="font-semibold text-ink">{b.suburb}</div>
                  <div className="mt-1">{b.jobs} job{b.jobs === 1 ? '' : 's'} in this view</div>
                  <div className="tabular font-semibold">Revenue {money(b.revenue)}</div>
                  <div className="tabular text-slate-600">Average {money(b.average)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </Pane>
      )}
      <Pane name="job-dots" style={{ zIndex: 460 }}>
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pane="job-dots"
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              fillColor: statusColor(p.status),
              fillOpacity: p.status === 'declined' ? 0.55 : 0.95,
            }}
          >
            <Popup>
              <div className="min-w-[180px] text-sm text-slate-800">
                <div className="font-mono text-xs font-bold text-slate-700">{p.code}</div>
                <div className="font-semibold text-ink">{p.client}</div>
                <div>{p.suburb}</div>
                <div className="tabular mt-1 font-semibold">{money(p.value)}</div>
                <div className="text-xs text-slate-500">
                  {STATUS_LABEL[p.status]} · {p.stage}
                </div>
                <Link to={`/jobs/${p.id}`} className="mt-2 inline-flex min-h-[40px] items-center font-semibold text-[#172566]">
                  Open job record
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </Pane>
    </MapContainer>
  )
}
