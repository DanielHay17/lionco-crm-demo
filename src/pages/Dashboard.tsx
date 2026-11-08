import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardHeader, MarginBadge, Modal, ServiceBadge, StageBadge } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { checklistBalance } from '../lib/checklist'
import { money, pct, ymd } from '../lib/format'
import { isQuotedOpen } from '../lib/clients'
import { inspectionStatus } from '../lib/inspection'
import { stockRows } from '../lib/inventory'
import { computeFinancials } from '../lib/profit'
import { jobFinancials, monthlyRevenue } from '../lib/state'
import { isCosted, isInField, isPaidStage } from '../lib/stages'
import { STAGES } from '../lib/types'
import { useStore } from '../store/StoreProvider'

const NAVY = '#172566'
const NAVY_LIGHT = '#8f9bd0'
const SLATE = '#626e81'
const kShort = (v: number) => `$${Math.round(v / 100) / 10}k`.replace('.0k', 'k')

type SortKey = 'margin' | 'profit' | 'quote' | 'code'

export default function Dashboard() {
  const { state } = useStore()
  const nav = useNavigate()
  const now = useMemo(() => new Date(), [])
  const [xeroOpen, setXeroOpen] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'margin', dir: 1 })

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const months = monthlyRevenue(state, now)
  const thisMonth = months[months.length - 1]
  const open = state.jobs.filter((j) => !isPaidStage(j.stage) && j.stage !== 'Declined')
  const openValue = open.reduce((s, j) => s + j.quote, 0)
  const awaiting = state.jobs.filter((j) => j.stage === 'Enquiry' || j.stage === 'Quote')
  const inProgress = state.jobs.filter((j) => isInField(j.stage) && j.stage !== 'Approved')
  const approved = state.jobs.filter((j) => j.stage === 'Approved')

  const costed = state.jobs.filter((j) => isCosted(j.stage)).map((j) => ({ job: j, f: jobFinancials(state, j) }))
  const blended = computeFinancials(
    costed.reduce((s, r) => s + r.f.quote, 0),
    costed.reduce((s, r) => s + r.f.cogs, 0),
  )

  const todayStr = ymd(now)
  const inspections = state.jobs.map((j) => ({ j, st: inspectionStatus(j, state.settings.inspectionIntervalDays, todayStr) }))
  const overdueInsp = inspections.filter((x) => x.st.state === 'overdue')
  const dueInsp = inspections.filter((x) => x.st.state === 'due-soon')
  const shortRows = stockRows(state).filter((r) => r.reserved > 0 && r.available <= 0)
  const quoteWaiting = state.jobs.filter((j) => isQuotedOpen(state, j))
  const captureOpen = state.captureInbox.filter((c) => c.status === 'pending').length
  const unbalanced = Object.values(state.checklists).filter((c) => checklistBalance(c).status === 'warning')

  const byStage = STAGES.map((s) => {
    const js = state.jobs.filter((j) => j.stage === s)
    return { stage: s, value: js.reduce((a, j) => a + j.quote, 0), count: js.length }
  })

  const rows = [...costed].sort((a, b) => {
    const v = (r: (typeof costed)[number]) => (sort.key === 'margin' ? r.f.marginPct : sort.key === 'profit' ? r.f.profit : sort.key === 'quote' ? r.f.quote : r.job.code)
    const x = v(a)
    const y = v(b)
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
  })
  const th = (key: SortKey, label: string, right = true) => (
    <th className={`px-3 py-2.5 ${right ? 'text-right' : ''}`}>
      <button
        onClick={() => setSort((p) => (p.key === key ? { key, dir: (p.dir * -1) as 1 | -1 } : { key, dir: key === 'code' ? 1 : -1 }))}
        className={`inline-flex min-h-[32px] items-center font-semibold uppercase tracking-wide hover:text-ink ${sort.key === key ? 'text-ink' : ''}`}
        aria-label={`Sort by ${label}`}
      >
        {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
      </button>
    </th>
  )

  const DAY = 86400000
  const addedThisWeek = state.jobs.filter((j) => now.getTime() - new Date(j.createdAt).getTime() < 7 * DAY).reduce((s, j) => s + j.quote, 0)
  const startedRecently = state.jobs.filter((j) =>
    j.activity.some((a) => a.kind === 'stage' && a.text.endsWith('→ Job in progress') && now.getTime() - new Date(a.at).getTime() < 14 * DAY),
  ).length
  const lastMonth = months[months.length - 2]
  const vsLast = lastMonth && lastMonth.revenue > 0 ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100 : 0
  const toTarget = thisMonth.target - thisMonth.revenue
  const pctOfTarget = thisMonth.target > 0 ? (thisMonth.revenue / thisMonth.target) * 100 : 0

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-6 py-4 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <LogoMark size={40} />
          <div>
            <h1 className="font-display text-[22px] font-bold uppercase tracking-[0.08em]">{greeting}, Paul</h1>
            <p className="text-[13px] text-slate-400">{now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Owner overview</p>
          </div>
        </div>
        <p className="hidden text-right font-display text-[13px] font-semibold uppercase leading-snug tracking-[0.16em] text-white/70 lg:block">
          Safe. Reliable.
          <br />
          Scaffolding done right.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Open pipeline value"
          value={money(openValue)}
          sub={`${open.length} unpaid jobs · ${money(awaiting.reduce((s, j) => s + j.quote, 0))} still to win`}
          delta={addedThisWeek > 0 ? { text: `+${money(addedThisWeek)} added this week`, tone: 'up' } : undefined}
        />
        <Kpi
          label="Jobs in the field"
          value={String(inProgress.length)}
          sub={`${money(inProgress.reduce((s, j) => s + j.quote, 0))} booked / on site / returning · ${approved.length} approved, queued`}
          delta={{ text: `${startedRecently} started in last 14 days`, tone: 'neutral' }}
        />
        <Kpi
          label={`Revenue — ${now.toLocaleDateString('en-AU', { month: 'long' })}`}
          value={money(thisMonth.revenue)}
          sub={toTarget > 0 ? `${pct(pctOfTarget)} of ${money(thisMonth.target)} target · ${money(toTarget)} to go` : `Target of ${money(thisMonth.target)} reached`}
          bar={Math.min(100, pctOfTarget)}
          delta={lastMonth ? { text: `${vsLast >= 0 ? '▲' : '▼'} ${Math.abs(vsLast).toFixed(0)}% vs ${lastMonth.label.split(' ')[0]} (${money(lastMonth.revenue)})`, tone: vsLast >= 0 ? 'up' : 'down' } : undefined}
        />
        <Kpi
          label="Average margin"
          value={pct(blended.marginPct, 1)}
          sub={`${costed.length} costed jobs · ${money(blended.profit)} profit`}
          tone={blended.marginPct >= 20 ? 'text-emerald-600' : blended.marginPct >= 0 ? 'text-amber-600' : 'text-red-600'}
          delta={{ text: `${blended.marginPct >= 20 ? '▲' : '▼'} ${Math.abs(blended.marginPct - 20).toFixed(1)} pts vs 20% healthy line`, tone: blended.marginPct >= 20 ? 'up' : 'down' }}
        />
      </div>

      <Card className="mb-4">
        <CardHeader title="Operations attention" sub="Live from the connected workflow" />
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <AttentionTile to="/site" tone={overdueInsp.length ? 'red' : dueInsp.length ? 'amber' : 'green'} big={`${overdueInsp.length + dueInsp.length}`} label="Inspections due / overdue" sub={`${overdueInsp.length} overdue · ${dueInsp.length} due within 7 days (demo reminder, ${state.settings.inspectionIntervalDays}-day interval)`} />
          <AttentionTile to="/catalogue" tone={shortRows.length ? 'amber' : 'green'} big={`${shortRows.length}`} label="Kit at zero availability" sub={shortRows.length ? shortRows.slice(0, 3).map((r) => r.item.name).join(', ') : 'No fully-reserved items'} />
          <AttentionTile to="/quotes" tone={quoteWaiting.length ? 'amber' : 'green'} big={`${quoteWaiting.length}`} label="Quotes awaiting decision" sub={`${money(quoteWaiting.reduce((a, j) => a + j.quote, 0))} issued, open`} />
          <AttentionTile to="/integrations" tone={captureOpen ? 'amber' : 'green'} big={`${captureOpen}`} label="Receipts needing a human" sub="Mock capture exceptions (hyperlink-only / failed forward)" />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline value by stage" sub="Quoted value of jobs in each stage · AUD" />
          <div className="h-[250px] p-3 pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} layout="vertical" margin={{ left: 4, right: 52 }}>
                <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={kShort} tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={104}
                  tick={{ fontSize: 11, fill: '#101215' }}
                  tickFormatter={(s: string) => (s === 'Google review requested' ? 'Review requested' : s)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v, _n, p) => [`${money(Number(v))} · ${(p.payload as { count: number }).count} job(s)`, 'Quoted value']} />
                <Bar dataKey="value" fill={NAVY} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
                  <LabelList dataKey="value" position="right" formatter={(v) => (Number(v) > 0 ? kShort(Number(v)) : '')} style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Monthly revenue vs target" sub="Last 12 months · AUD · this month = jobs in Paid / Review requested" />
          <div className="h-[250px] p-3 pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={months} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={kShort} tick={{ fontSize: 11, fill: SLATE }} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v, n) => [money(Number(v)), n]} labelFormatter={(l) => `${l}`} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill={NAVY} radius={[4, 4, 0, 0]} barSize={26} isAnimationActive={false}>
                  {months.map((m, i) => (
                    <Cell key={m.key} fill={i === months.length - 1 ? NAVY_LIGHT : NAVY} />
                  ))}
                </Bar>
                <Line dataKey="target" name="Monthly target" stroke={SLATE} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="overflow-x-auto lg:col-span-3">
          <CardHeader title="Job profitability" sub="Jobs in progress or later · sorted by margin, worst first (click a header to re-sort)" />
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {th('code', 'Job', false)}
                <th className="px-3 py-2.5">Client</th>
                {th('quote', 'Quote')}
                <th className="px-3 py-2.5 text-right">COGS</th>
                {th('profit', 'Profit')}
                {th('margin', 'Margin')}
                <th className="px-3 py-2.5">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ job, f }) => (
                <tr key={job.id} onClick={() => nav(`/jobs/${job.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold text-slate-700">{job.code}</td>
                  <td className="px-3 py-2 font-medium text-ink">
                    {job.client}
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-slate-500">{job.suburb} <ServiceBadge service={job.serviceType} drone={job.droneSurvey} /></div>
                  </td>
                  <td className="tabular px-3 py-2 text-right">{money(f.quote)}</td>
                  <td className="tabular px-3 py-2 text-right text-slate-600">{money(f.cogs)}</td>
                  <td className="tabular px-3 py-2 text-right">
                    <MarginBadge f={f} compact />
                  </td>
                  <td className="tabular px-3 py-2 text-right font-bold">{pct(f.marginPct, 1)}</td>
                  <td className="px-3 py-2">
                    <StageBadge stage={job.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Healthy ≥ 20%</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Thin 0–20%</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Loss</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-dashed">
            <CardHeader title="Xero sync" right={<Badge tone="amber">Mock only</Badge>} />
            <div className="space-y-3 p-5 text-sm">
              <p className="text-slate-600">Xero is the planned accounting source of truth. The demo has a <b>mock, disconnected</b> sync queue ({state.syncQueue.filter((x) => x.status === 'queued').length} items queued locally) — nothing is sent anywhere.</p>
              <ul className="space-y-1.5 text-xs text-slate-500">
                {['Invoices → Xero', 'Expenses → Xero bills (by job code)', 'Payments ← Xero (auto-move to Paid)'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-dashed border-slate-400" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link to="/integrations" className="flex min-h-[40px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open integration centre (mock)
              </Link>
              <button onClick={() => setXeroOpen(true)} className="min-h-[32px] w-full text-center text-[11px] text-slate-400 underline">
                Why is this not connected?
              </button>
            </div>
          </Card>
          <Card>
            <div className="p-5 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs attention</div>
              <ul className="mt-2 space-y-2">
                {costed
                  .filter((r) => r.f.profit < 0)
                  .map((r) => (
                    <li key={r.job.id}>
                      <Link to={`/jobs/${r.job.id}`} className="font-medium text-red-700 hover:underline">
                        {r.job.code} is losing {money(-r.f.profit)}
                      </Link>
                    </li>
                  ))}
                {unbalanced.map((c) => (
                  <li key={c.jobId}>
                    <Link to={`/packing/${c.jobId}`} className="font-medium text-red-700 hover:underline">
                      {state.jobs.find((j) => j.id === c.jobId)?.code} truck load is unbalanced
                    </Link>
                  </li>
                ))}
                <li className="text-slate-500">
                  <Link to="/packing" className="font-medium text-brand-600 hover:underline">
                    Review truck packing balance →
                  </Link>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Roadmap · v2" sub="Planned next — see Future scope. Integrations in this demo are mock only" right={<Badge>Not built yet</Badge>} />
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {ROADMAP.map((r) => (
            <div key={r.title} className="p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">{r.icon}</div>
              <div className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">{r.title}</div>
              <p className="mt-1 text-xs leading-snug text-slate-500">{r.text}</p>
              <div className="mt-2.5">
                <Badge tone="slate">Planned · v2</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={xeroOpen} onClose={() => setXeroOpen(false)} title="Xero integration" width="max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-2xl">🔌</div>
          <p className="font-display text-xl font-bold uppercase tracking-[0.08em] text-ink">Not connected</p>
          <p className="mt-1 text-sm text-slate-600">A real Xero connection (OAuth, API) is future work. The demo only simulates a queue locally.</p>
          <p className="mt-3 text-xs text-slate-400">This demo makes no network calls and holds no accounting credentials.</p>
          <Button variant="primary" className="mt-5" onClick={() => setXeroOpen(false)}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  )
}

const ROADMAP = [
  { icon: '📒', title: 'Xero sync', text: 'Two-way sync of invoices, bills and payments, keyed by job code.' },
  { icon: '⭐', title: 'Google reviews', text: 'Automatic SMS / email review link when a job reaches Paid.' },
  { icon: '📷', title: 'Mobile expenses', text: 'Snap a receipt on site; amount and supplier pre-filled to the job.' },
  { icon: '🛸', title: 'Drone surveys', text: 'Upload drone footage and site survey reports against the job.' },
  { icon: '🔗', title: 'Customer portal', text: 'Clients view quotes, approve online and track job progress.' },
]

function Kpi({ label, value, sub, bar, tone = 'text-ink', delta }: { label: string; value: string; sub: string; bar?: number; tone?: string; delta?: { text: string; tone: 'up' | 'down' | 'neutral' } }) {
  return (
    <Card className="p-5">
      <div className="font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`tabular mt-1.5 text-3xl font-bold tracking-tight ${tone}`}>{value}</div>
      {delta && (
        <div className={`mt-1 text-xs font-semibold ${delta.tone === 'up' ? 'text-emerald-600' : delta.tone === 'down' ? 'text-red-600' : 'text-slate-500'}`}>{delta.text}</div>
      )}
      {bar !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className="mt-1.5 text-xs text-slate-500">{sub}</div>
    </Card>
  )
}

function AttentionTile({ to, tone, big, label, sub }: { to: string; tone: 'red' | 'amber' | 'green'; big: string; label: string; sub: string }) {
  const c = { red: 'text-red-600', amber: 'text-amber-600', green: 'text-emerald-600' }[tone]
  return (
    <Link to={to} className="block p-4 transition-colors hover:bg-slate-50">
      <div className={`tabular text-2xl font-bold ${c}`}>{big}</div>
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="mt-0.5 text-xs text-slate-500">{sub}</div>
    </Link>
  )
}
