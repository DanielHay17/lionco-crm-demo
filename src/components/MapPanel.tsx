import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Notice from './Notice'
import AnalyticsMap from './analytics/AnalyticsMap'
import type { MapJobPoint } from './analytics/SydneyMap'
import { inputCls } from './ui'
import { filterMapJobs } from '../lib/mapgeo'
import { analyticsStatus } from '../lib/areaAnalytics'
import { MAP_GROUPS, mapGroupOf, type MapGroup } from '../lib/stages'
import { money } from '../lib/format'
import { useStore } from '../store/StoreProvider'

const GROUP_COLOR = Object.fromEntries(MAP_GROUPS.map((g) => [g.id, g.color])) as Record<MapGroup, string>

/** Map + stage-group, suburb and date filters. `clientId` scopes it to one client's history. */
export default function MapPanel({ clientId, defaultGroups }: { clientId?: string; defaultGroups?: MapGroup[] }) {
  const { state } = useStore()
  const nav = useNavigate()
  const [groups, setGroups] = useState<Set<MapGroup>>(new Set(defaultGroups ?? ['quoted', 'approved', 'erected', 'takedown']))
  const [suburb, setSuburb] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const base = useMemo(() => (clientId ? state.jobs.filter((j) => j.clientId === clientId) : state.jobs), [state.jobs, clientId])
  const suburbs = useMemo(() => [...new Set(base.map((j) => j.suburb))].sort(), [base])
  const shown = filterMapJobs(base, { groups, suburb, from: from || undefined, to: to || undefined, clientId })
  const points: MapJobPoint[] = shown.flatMap((j) => {
    if (!Number.isFinite(j.lat) || !Number.isFinite(j.lng)) return []
    return [{ id: j.id, code: j.code, client: j.client, suburb: j.suburb, address: j.siteAddress, value: j.quote, status: analyticsStatus(j.stage), stage: j.stage, lat: j.lat!, lng: j.lng! }]
  })
  const focusKey = suburb ? `suburb:${suburb}` : clientId ? `client:${clientId}` : 'all'
  const toggle = (g: MapGroup) => setGroups((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Stage groups">
        {MAP_GROUPS.map((g) => {
          const count = base.filter((j) => mapGroupOf(j.stage) === g.id).length
          return (
            <button key={g.id} aria-pressed={groups.has(g.id)} onClick={() => toggle(g.id)} className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${groups.has(g.id) ? 'bg-white text-ink ring-slate-400 shadow-sm' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>
              <span className="h-3 w-3 rounded-full" style={{ background: g.color, opacity: groups.has(g.id) ? 1 : 0.4 }} />
              {g.label} <span className="text-slate-400">{count}</span>
            </button>
          )
        })}
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">Suburb
          <select className={`${inputCls} mt-1 !w-44`} value={suburb} onChange={(e) => setSuburb(e.target.value)}>
            <option value="">All suburbs</option>
            {suburbs.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Enquiry date from
          <input type="date" className={`${inputCls} mt-1 !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">to
          <input type="date" className={`${inputCls} mt-1 !w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(suburb || from || to) && <button className="min-h-[38px] text-xs font-semibold text-brand-600" onClick={() => { setSuburb(''); setFrom(''); setTo('') }}>Clear filters</button>}
        <span className="ml-auto text-xs text-slate-500">{shown.length} of {base.length} jobs shown</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="analytics-map relative h-[420px] w-full max-w-full overflow-hidden rounded-lg border border-slate-200 lg:col-span-2 lg:h-[520px]" role="region" aria-label="OpenStreetMap of fictional Sydney jobs">
          <AnalyticsMap points={points} bubbles={[]} showBubbles={false} zones={[]} showZones={false} pinMinZoom={0} focusKey={focusKey} />
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {shown.length === 0 ? <p className="p-4 text-sm text-slate-500">No jobs match these filters.</p> : (
            <ul className="divide-y divide-slate-100">
              {shown.map((j) => (
                <li key={j.id}>
                  <button onClick={() => nav(`/jobs/${j.id}`)} className="flex min-h-[48px] w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: GROUP_COLOR[mapGroupOf(j.stage)] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{j.client}</span>
                      <span className="block truncate text-xs text-slate-500"><span className="font-mono">{j.code}</span> · {j.suburb} · {j.stage}</span>
                    </span>
                    <span className="tabular text-xs font-semibold text-slate-700">{money(j.quote)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export const MapNote = () => (
  <Notice tone="info" title="OPENSTREETMAP">
    Street map of Greater Sydney. Pins are random fictional demo sites, not real residents or customers. Tiles load from OpenStreetMap for the area on screen only. No API key.
  </Notice>
)
