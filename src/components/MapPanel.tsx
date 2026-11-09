import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Notice from './Notice'
import { inputCls } from './ui'
import { jobPoint, filterMapJobs, SUBURB_POS } from '../lib/mapgeo'
import { MAP_GROUPS, mapGroupOf, type MapGroup } from '../lib/stages'
import type { Job } from '../lib/types'
import { money } from '../lib/format'
import { useStore } from '../store/StoreProvider'

const GROUP_COLOR = Object.fromEntries(MAP_GROUPS.map((g) => [g.id, g.color])) as Record<MapGroup, string>
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

/** Local SVG schematic — honestly illustrative: positions are approximate, no map tiles, no API, no tokens. */
export function SchematicMap({ jobs, onOpen }: { jobs: Job[]; onOpen: (j: Job) => void }) {
  const [hover, setHover] = useState<Job | null>(null)
  const pts = jobs.map((j) => ({ j, p: jobPoint(j) }))
  const anyUnplaced = pts.some((x) => x.p.unplaced)
  return (
    <div>
      <svg viewBox="0 0 100 100" className="w-full rounded-lg border border-slate-200 bg-slate-50" role="group" aria-label="Illustrative job map. Each bubble is a job; activate to open it.">
        <path d="M100 0 L90 0 C92 18 84 30 90 44 C95 58 86 74 80 100 L100 100 Z" fill="#dbeafe" />
        <text x="95" y="52" fontSize="2.6" fill="#60a5fa" textAnchor="middle" transform="rotate(90 95 52)">coast (illustrative)</text>
        {Object.entries(SUBURB_POS).map(([name, [x, y]]) => (
          <text key={name} x={x} y={y + 5.2} fontSize="2.3" fill="#94a3b8" textAnchor="middle">{cap(name)}</text>
        ))}
        {anyUnplaced && (
          <g>
            <rect x="2" y="88" width="44" height="10" rx="1.5" fill="#fff" stroke="#cbd5e1" strokeDasharray="1.2 1" />
            <text x="3.2" y="90.8" fontSize="2.1" fill="#64748b">Suburbs not on this schematic</text>
          </g>
        )}
        {pts.map(({ j, p }) => {
          const color = GROUP_COLOR[mapGroupOf(j.stage)]
          const open = () => onOpen(j)
          return (
            <g
              key={j.id}
              role="link"
              tabIndex={0}
              aria-label={`${j.code} ${j.client}, ${j.suburb}, ${j.stage}`}
              onClick={open}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
              onMouseEnter={() => setHover(j)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(j)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-brand-600"
            >
              <circle cx={p.x} cy={p.y} r="4.6" fill="transparent" className="ring" strokeWidth="0.6" stroke="transparent" />
              <circle cx={p.x} cy={p.y} r="2.7" fill={color} fillOpacity={j.stage === 'Declined' ? 0.5 : 0.9} stroke="#fff" strokeWidth="0.6" strokeDasharray={j.stage === 'Declined' ? '0.8 0.6' : undefined} />
              <title>{`${j.code} · ${j.client} · ${j.stage} · ${money(j.quote)}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="mt-1.5 min-h-[34px] text-xs text-slate-600" aria-live="polite">
        {hover ? <><b className="font-mono">{hover.code}</b> · {hover.client} · {hover.siteAddress}, {hover.suburb} · {hover.stage} · {money(hover.quote)} <span className="text-slate-400">(click to open)</span></> : 'Hover, focus or tap a bubble for details; click to open the job.'}
      </div>
      <p className="text-[11px] italic text-slate-500">Illustrative schematic — positions are approximate and not to scale. No map service, token or geocoding is used.</p>
    </div>
  )
}

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
        <div className="lg:col-span-2"><SchematicMap jobs={shown} onOpen={(j) => nav(`/jobs/${j.id}`)} /></div>
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

export const MapNote = () => <Notice tone="info" title="ILLUSTRATIVE MAP">A local SVG schematic — not a real map. Suburb positions are approximate and unknown suburbs go to a holding strip.</Notice>
