import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AnalyticsMap from '../components/analytics/AnalyticsMap'
import type { MapBubble, MapJobPoint } from '../components/analytics/SydneyMap'
import Notice from '../components/Notice'
import { Card, CardHeader, EmptyState, inputCls, PageHeader } from '../components/ui'
import {
  ANALYTICS_STATUSES,
  analyticsStatus,
  areaKpis,
  filterAnalyticsJobs,
  jobInFocus,
  jobInRange,
  sortSuburbRows,
  statusCounts,
  suburbStats,
  type AnalyticsStatus,
  type DateRangeId,
  type SuburbSortKey,
} from '../lib/areaAnalytics'
import { money } from '../lib/format'
import { revenueByPostalArea } from '../lib/revenueZones'
import { REGIONS, regionOf, type AreaFocus, type RegionId } from '../lib/sydneyGeo'
import { useStore } from '../store/StoreProvider'

const ALL_STATUSES = new Set<AnalyticsStatus>(ANALYTICS_STATUSES.map((s) => s.id))

export default function Analytics() {
  const { state } = useStore()
  const now = useMemo(() => new Date(), [])
  const [range, setRange] = useState<DateRangeId>('all')
  const [region, setRegion] = useState<RegionId | ''>('')
  const [suburb, setSuburb] = useState('')
  const [statuses, setStatuses] = useState<Set<AnalyticsStatus>>(() => new Set(ALL_STATUSES))
  const [bubblesOn, setBubblesOn] = useState(false)
  const [sort, setSort] = useState<{ key: SuburbSortKey; dir: 1 | -1 }>({ key: 'revenue', dir: -1 })

  const focus = useMemo<AreaFocus>(() => (suburb ? { kind: 'suburb', suburb } : region ? { kind: 'region', region } : { kind: 'all' }), [suburb, region])
  const focusKey = suburb ? `suburb:${suburb}` : region ? `region:${region}` : 'all'

  const scoped = useMemo(() => state.jobs.filter((j) => jobInFocus(j, focus) && jobInRange(j, range, now)), [state.jobs, focus, range, now])
  const shown = useMemo(() => filterAnalyticsJobs(state.jobs, { statuses, focus, range, now }), [state.jobs, statuses, focus, range, now])
  const counts = useMemo(() => statusCounts(scoped), [scoped])
  const kpis = useMemo(() => areaKpis(shown), [shown])
  const stats = useMemo(() => suburbStats(shown), [shown])
  const rows = useMemo(() => sortSuburbRows(stats, sort.key, sort.dir), [stats, sort])
  const chartRows = stats.filter((r) => r.revenue > 0).slice(0, 12)

  const suburbOptions = useMemo(() => {
    const names = new Set<string>()
    for (const j of state.jobs) {
      if (region && regionOf(j.suburb) !== region) continue
      names.add(j.suburb)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [state.jobs, region])

  const zones = useMemo(() => revenueByPostalArea(shown), [shown])
  const points: MapJobPoint[] = shown.flatMap((j) => {
    if (!Number.isFinite(j.lat) || !Number.isFinite(j.lng)) return []
    return [{ id: j.id, code: j.code, client: j.client, suburb: j.suburb, address: j.siteAddress, value: j.quote, status: analyticsStatus(j.stage), stage: j.stage, lat: j.lat!, lng: j.lng! }]
  })
  const bubbles: MapBubble[] = stats.flatMap((r) => {
    if (r.revenue <= 0 || r.lat == null || r.lng == null) return []
    return [{ suburb: r.suburb, lat: r.lat, lng: r.lng, revenue: r.revenue, jobs: r.jobs, average: r.average }]
  })

  const toggle = (id: AnalyticsStatus) =>
    setStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onRegion = (value: string) => {
    setRegion(value as RegionId | '')
    setSuburb('')
  }

  const th = (key: SuburbSortKey, label: string, right = true) => (
    <th className={`px-3 py-2.5 ${right ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => setSort((p) => (p.key === key ? { key, dir: (p.dir * -1) as 1 | -1 } : { key, dir: key === 'suburb' ? 1 : -1 }))}
        className={`inline-flex min-h-[40px] items-center font-semibold uppercase tracking-wide hover:text-ink ${sort.key === key ? 'text-ink' : ''}`}
        aria-label={`Sort by ${label}`}
      >
        {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
      </button>
    </th>
  )

  const chartHeight = Math.min(440, Math.max(220, chartRows.length * 32 + 32))

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Coverage map of fictional Sydney jobs. Scroll and zoom from the city to a street, then click a pin for the job. Figures stay in this browser."
      />
      {state.jobs.length < 40 && (
        <Notice className="mb-4" title="OLDER DEMO SAVE">
          This browser still has an earlier saved demo. Use Reset demo data in the menu to load the full Sydney sample.
        </Notice>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi testId="kpi-revenue" label="Total revenue" value={money(kpis.revenue)} sub="Booked jobs in this view, ex GST" />
        <Kpi testId="kpi-active" label="Active jobs" value={String(kpis.activeJobs)} sub="In progress, on site or returning" />
        <Kpi testId="kpi-past" label="Past jobs" value={String(kpis.pastJobs)} sub="Invoiced, paid or review requested" />
        <Kpi testId="kpi-top" label="Top suburb" value={kpis.topSuburb ?? '—'} sub={kpis.topSuburb ? money(kpis.topSuburbRevenue) : 'No booked revenue'} />
        <Kpi testId="kpi-average" label="Average job value" value={kpis.bookedJobs ? money(kpis.averageJobValue) : '—'} sub={kpis.bookedJobs ? `${kpis.bookedJobs} booked jobs` : 'No booked jobs'} wide />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block min-w-0 text-xs font-semibold text-slate-600">
            Date range
            <select data-testid="date-range" className={`${inputCls} mt-1 min-h-[44px]`} value={range} onChange={(e) => setRange(e.target.value as DateRangeId)}>
              <option value="all">All time</option>
              <option value="last-12-months">Last 12 months</option>
              <option value="this-year">This year</option>
            </select>
          </label>
          <label className="block min-w-0 text-xs font-semibold text-slate-600">
            Focus area
            <select data-testid="focus-area" className={`${inputCls} mt-1 min-h-[44px]`} value={region} onChange={(e) => onRegion(e.target.value)}>
              <option value="">Greater Sydney</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-xs font-semibold text-slate-600">
            Suburb
            <select data-testid="focus-suburb" className={`${inputCls} mt-1 min-h-[44px]`} value={suburb} onChange={(e) => setSuburb(e.target.value)}>
              <option value="">All suburbs in this area</option>
              {suburbOptions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3" role="group" aria-label="Job status">
          {ANALYTICS_STATUSES.map((s) => {
            const on = statuses.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`status-${s.id}`}
                aria-pressed={on}
                onClick={() => toggle(s.id)}
                className={`inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-full px-3 text-sm font-semibold ring-1 ring-inset ${on ? 'bg-white text-ink ring-slate-400 shadow-sm' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color, opacity: on ? 1 : 0.35 }} />
                {s.label}
                <span className="text-xs font-medium text-slate-500">{s.detail}</span>
                <span className="tabular text-xs text-slate-500">{counts[s.id]}</span>
              </button>
            )
          })}
          <button
            type="button"
            data-testid="toggle-bubbles"
            aria-pressed={bubblesOn}
            onClick={() => setBubblesOn((v) => !v)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold ring-1 ring-inset ${bubblesOn ? 'bg-white text-ink ring-slate-400 shadow-sm' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}
          >
            <span className="h-3 w-3 shrink-0 rounded-full border border-[#172566] bg-[#172566]/25" />
            Revenue bubbles
          </button>
        </div>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <div className="analytics-map relative h-[62vh] min-h-[420px] w-full max-w-full lg:h-[680px]" role="region" aria-label="Coverage map of fictional Sydney jobs" data-testid="sydney-map">
          <AnalyticsMap points={points} bubbles={bubbles} showBubbles={bubblesOn} zones={zones} focusKey={focusKey} />
          {points.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] mx-auto w-fit -translate-y-1/2 rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow ring-1 ring-slate-200">
              No jobs in this view
            </div>
          )}
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] leading-snug text-slate-500">
          Map data{' '}
          <a className="font-semibold text-[#172566] underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
          . Shaded areas are Australian Bureau of Statistics postal areas (ASGS Edition 3, 2021, CC BY 4.0), simplified by about 400 metres. They approximate postcodes and are not Australia Post boundaries. Dollar labels are booked revenue for the fictional jobs in the current filters. Circles marked “jobs” are counts, not dollars. Street tiles are requested from OpenStreetMap only for the area on screen (no API key). Pins are random fictional demo sites, not real residents or customers.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader
            title="Revenue by suburb"
            sub={stats.filter((r) => r.revenue > 0).length > chartRows.length ? 'Top 12 suburbs in this view. The table has the full list.' : 'Booked contract value in this view'}
          />
          {chartRows.length === 0 ? (
            <EmptyState title="No booked revenue in this view">Widen the date range or turn a status back on.</EmptyState>
          ) : (
            <div className="w-full min-w-0 overflow-hidden p-2" style={{ height: chartHeight }} role="img" aria-label="Bar chart of booked revenue by suburb">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: '#626e81' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="suburb" width={108} tick={{ fontSize: 11, fill: '#101215' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="revenue" name="Booked revenue" fill="#172566" radius={[0, 3, 3, 0]} barSize={14} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Suburbs" sub={`${shown.length} job${shown.length === 1 ? '' : 's'} in this view · click a heading to sort`} />
          {rows.length === 0 ? (
            <EmptyState title="No suburbs in this view">Try Greater Sydney or all time.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {th('suburb', 'Suburb', false)}
                    {th('jobs', 'Jobs')}
                    {th('revenue', 'Revenue')}
                    {th('average', 'Average')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.suburb}>
                      <td className="px-3 py-2.5 font-medium text-ink">{r.suburb}</td>
                      <td className="tabular px-3 py-2.5 text-right">{r.jobs}</td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold">{money(r.revenue)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{r.booked ? money(r.average) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, testId, wide }: { label: string; value: string; sub: string; testId: string; wide?: boolean }) {
  return (
    <Card className={`p-3 sm:p-4 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <div className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div data-testid={testId} className="tabular mt-1 break-words text-xl font-bold leading-tight text-ink sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">{sub}</div>
    </Card>
  )
}
