import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card, CardHeader, MarginBadge, Modal, PageHeader, StageBadge } from '../components/ui'
import { checklistBalance } from '../lib/checklist'
import { money, pct } from '../lib/format'
import { computeFinancials } from '../lib/profit'
import { isCosted, isPaidStage, jobFinancials, monthlyRevenue } from '../lib/state'
import { STAGES } from '../lib/types'
import { useStore } from '../store/StoreProvider'

const SLATE = '#334155'
const AMBER = '#f59e0b'

type SortKey = 'margin' | 'profit' | 'quote' | 'code'

export default function Dashboard() {
  const { state } = useStore()
  const nav = useNavigate()
  const now = useMemo(() => new Date(), [])
  const [xeroOpen, setXeroOpen] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'margin', dir: 1 })

  const months = monthlyRevenue(state, now)
  const thisMonth = months[months.length - 1]
  const open = state.jobs.filter((j) => !isPaidStage(j.stage))
  const openValue = open.reduce((s, j) => s + j.quote, 0)
  const awaiting = state.jobs.filter((j) => j.stage === 'Enquiry' || j.stage === 'Quote')
  const inProgress = state.jobs.filter((j) => j.stage === 'Job in progress')
  const approved = state.jobs.filter((j) => j.stage === 'Approved')

  const costed = state.jobs.filter((j) => isCosted(j.stage)).map((j) => ({ job: j, f: jobFinancials(state, j) }))
  const blended = computeFinancials(
    costed.reduce((s, r) => s + r.f.quote, 0),
    costed.reduce((s, r) => s + r.f.cogs, 0),
  )

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
        className={`font-semibold uppercase tracking-wide hover:text-slate-900 ${sort.key === key ? 'text-slate-900' : ''}`}
        aria-label={`Sort by ${label}`}
      >
        {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
      </button>
    </th>
  )

  const pctOfTarget = thisMonth.target > 0 ? (thisMonth.revenue / thisMonth.target) * 100 : 0

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Owner overview · ${now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <div className="mb-4 grid grid-cols-4 gap-4">
        <Kpi label="Open pipeline value" value={money(openValue)} sub={`${open.length} unpaid jobs · ${money(awaiting.reduce((s, j) => s + j.quote, 0))} still to win`} />
        <Kpi label="Jobs in progress" value={String(inProgress.length)} sub={`${money(inProgress.reduce((s, j) => s + j.quote, 0))} on site · ${approved.length} approved, queued`} />
        <Kpi
          label={`Revenue — ${now.toLocaleDateString('en-AU', { month: 'long' })}`}
          value={money(thisMonth.revenue)}
          sub={`${pct(pctOfTarget)} of ${money(thisMonth.target)} target`}
          bar={Math.min(100, pctOfTarget)}
          tone={pctOfTarget >= 100 ? 'text-emerald-600' : 'text-slate-900'}
        />
        <Kpi
          label="Average margin"
          value={pct(blended.marginPct, 1)}
          sub={`${costed.length} costed jobs · ${money(blended.profit)} profit`}
          tone={blended.marginPct >= 20 ? 'text-emerald-600' : blended.marginPct >= 0 ? 'text-amber-600' : 'text-red-600'}
        />
      </div>

      <div className="mb-4 grid grid-cols-5 gap-4">
        <Card className="col-span-2">
          <CardHeader title="Pipeline value by stage" sub="Total quoted value of jobs currently in each stage" />
          <div className="h-[250px] p-3 pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={112}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  tickFormatter={(s: string) => (s === 'Google review requested' ? 'Review requested' : s)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v, _n, p) => [`${money(Number(v))} · ${(p.payload as { count: number }).count} job(s)`, 'Value']}
                />
                <Bar dataKey="value" fill={SLATE} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-3">
          <CardHeader title="Monthly revenue vs target" sub="Last 12 months · current month counts jobs in Paid / Review requested" />
          <div className="h-[250px] p-3 pr-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={months} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v, n) => [money(Number(v)), n]} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill={SLATE} radius={[4, 4, 0, 0]} barSize={26} isAnimationActive={false} />
                <Line dataKey="target" name="Target" stroke={AMBER} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-3 overflow-hidden">
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
                <tr key={job.id} onClick={() => nav(`/jobs/${job.id}`)} className="cursor-pointer hover:bg-amber-50/50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold text-slate-700">{job.code}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {job.client}
                    <div className="text-xs font-normal text-slate-500">{job.suburb}</div>
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
          <Card>
            <CardHeader title="Xero sync" right={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Not connected</span>} />
            <div className="space-y-3 p-5 text-sm">
              <p className="text-slate-600">Push invoices and expenses to Xero, and pull payment status back, so this dashboard matches the books.</p>
              <ul className="space-y-1 text-xs text-slate-500">
                <li>• Invoices → Xero</li>
                <li>• Expenses → Xero bills</li>
                <li>• Payments ← Xero (auto-move to Paid)</li>
              </ul>
              <Button variant="primary" className="w-full" onClick={() => setXeroOpen(true)}>
                Sync with Xero
              </Button>
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
                  <Link to="/packing" className="font-medium text-slate-700 hover:underline">
                    Review truck packing balance →
                  </Link>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={xeroOpen} onClose={() => setXeroOpen(false)} title="Xero integration" width="max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">🔌</div>
          <p className="text-lg font-semibold text-slate-900">Coming soon</p>
          <p className="mt-1 text-sm text-slate-600">Xero integration planned for v2.</p>
          <p className="mt-3 text-xs text-slate-400">This demo makes no network calls and holds no accounting credentials.</p>
          <Button variant="primary" className="mt-5" onClick={() => setXeroOpen(false)}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Kpi({ label, value, sub, bar, tone = 'text-slate-900' }: { label: string; value: string; sub: string; bar?: number; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`tabular mt-1.5 text-3xl font-bold tracking-tight ${tone}`}>{value}</div>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className="mt-2 text-xs text-slate-500">{sub}</div>
    </Card>
  )
}
