import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Notice, { StatusPill } from '../components/Notice'
import NumInput from '../components/NumInput'
import { Badge, Button, Card, EmptyState, inputCls, PageHeader, Tabs } from '../components/ui'
import { suburbRevenue } from '../lib/analytics'
import { findClient } from '../lib/clients'
import { money } from '../lib/format'
import { updateClient } from '../lib/ops'
import { atOrAfter, isPaidStage } from '../lib/stages'
import { monthlyRevenue } from '../lib/state'
import { useStore } from '../store/StoreProvider'

type Tab = 'status' | 'sop' | 'drone' | 'bi' | 'followup'
const TABS: Tab[] = ['status', 'sop', 'drone', 'bi', 'followup']

export default function Roadmap() {
  const [params, setParams] = useSearchParams()
  const q = params.get('tab') as Tab | null
  const tab: Tab = q && TABS.includes(q) ? q : 'status'
  return (
    <div>
      <PageHeader title="Future Scope" subtitle="Previews and honest roadmap — kept apart from the working core" />
      <Notice tone="future" className="mb-4">Nothing on this page is a production feature. Previews use fictional data and local state only; nothing is sent, secured or backed up.</Notice>
      <Card>
        <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={[{ id: 'status', label: 'Infrastructure' }, { id: 'sop', label: 'SOP templates' }, { id: 'drone', label: 'Drone pre-flight' }, { id: 'bi', label: 'BI & cash flow' }, { id: 'followup', label: 'Review follow-up' }]} />
        <div className="p-5">
          {tab === 'status' && <Infra />}
          {tab === 'sop' && <Sop />}
          {tab === 'drone' && <Drone />}
          {tab === 'bi' && <Bi />}
          {tab === 'followup' && <FollowUp />}
        </div>
      </Card>
    </div>
  )
}

function Infra() {
  const rows: [string, string, 'live' | 'mock' | 'future'][] = [
    ['Data storage', 'Your browser’s localStorage on this device only. Clearing site data erases it; other devices and people cannot see it.', 'live'],
    ['Google sign-in / MFA', 'Not built. There is currently no sign-in of any kind; anyone with the browser can open the app.', 'future'],
    ['Backup admin access', 'Not built. No second admin, recovery path or access control exists.', 'future'],
    ['Hosted database, backups & point-in-time recovery', 'Not built. Nothing is stored on a server, so there are no backups to restore.', 'future'],
    ['Native iOS app', 'Not built. This is a responsive web app only.', 'future'],
    ['Xero / Gmail / WhatsApp / MYOB', 'Mock only — see Integration Centre. No connections exist.', 'mock'],
  ]
  return (
    <div className="space-y-4">
      <Notice tone="warn" title="DEMO SECURITY">This demo has <b>no secure authentication and no backups</b>. Don't enter real personal, client or financial data — use fictional details only. Nothing here should be read as a security feature.</Notice>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map(([t, d, tone]) => (
          <li key={t} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1"><div className="font-semibold text-ink">{t}</div><div className="text-sm text-slate-600">{d}</div></div>
            <StatusPill tone={tone}>{tone === 'live' ? 'How the demo works' : tone === 'mock' ? 'Mock' : 'Future — not built'}</StatusPill>
          </li>
        ))}
      </ul>
    </div>
  )
}

const SOPS = [
  { title: 'Pre-erect site walk', steps: ['Confirm site address and access with the site manager', 'Note ground conditions, overhead hazards and neighbouring properties', 'Photograph the site and mark the scaffold footprint', 'Confirm delivery route and truck parking', 'Record anything that changes the quote as a variation'] },
  { title: 'Handover to client', steps: ['Walk the scaffold with the site contact', 'Explain access points and not to alter the scaffold', 'Give the contact number for issues', 'Record the handover in the site folder'] },
  { title: 'Takedown & warehouse return', steps: ['Confirm takedown date and access with the client', 'Dismantle top-down; sort kit by type', 'Load truck by the packing zones', 'Unpack at the yard against the return checklist; note anything short or damaged'] },
  { title: 'Quote follow-up', steps: ['Check issued quotes older than a week', 'Call or email the buyer contact', 'Log the outcome; decline or revise the quote'] },
]
function Sop() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <Notice tone="future">Starter wording only to show the idea of reusable playbooks. These are <b>not approved procedures</b>, not safety documents, and are not linked to jobs yet.</Notice>
      {SOPS.map((s) => (
        <div key={s.title} className="rounded-lg border border-slate-200">
          <button className="flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-left font-semibold text-ink" aria-expanded={open === s.title} onClick={() => setOpen(open === s.title ? null : s.title)}>{s.title}<span aria-hidden>{open === s.title ? '−' : '+'}</span></button>
          {open === s.title && <ol className="list-decimal space-y-1 border-t border-slate-100 px-8 py-3 text-sm text-slate-700">{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>}
        </div>
      ))}
    </div>
  )
}

const PREFLIGHT = ['Check local airspace and flight permissions', 'Confirm pilot qualifications / operator approvals are in order', 'Inspect airframe, propellers and battery condition', 'Confirm site owner permission and notify neighbours as needed', 'Check weather and wind limits', 'Brief anyone on site about the flight area', 'Set return-to-home height and test fail-safes']
function Drone() {
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const done = PREFLIGHT.filter((p) => ticks[p]).length
  return (
    <div className="space-y-3">
      <Notice tone="warn" title="SAFETY DISCLAIMER">Illustrative mock only. This list is <b>not</b> a regulatory, safety or flight-approval tool. Follow the drone operator's own procedures and the rules that apply to you. Ticks are not saved.</Notice>
      <div className="text-sm text-slate-600">{done}/{PREFLIGHT.length} ticked</div>
      <ul className="space-y-1">
        {PREFLIGHT.map((p) => (
          <li key={p}><label className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!ticks[p]} onChange={(e) => setTicks({ ...ticks, [p]: e.target.checked })} />{p}</label></li>
        ))}
      </ul>
      <Button size="sm" onClick={() => setTicks({})}>Clear ticks</Button>
    </div>
  )
}

function Bi() {
  const { state } = useStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rows = useMemo(() => suburbRevenue(state, { basis: 'booked', from: from || undefined, to: to || undefined }), [state, from, to])
  const [items, setItems] = useState([{ n: 'Yard rent', v: 3200 }, { n: 'Insurance', v: 1450 }, { n: 'Vehicle finance', v: 2100 }, { n: 'Software & phones', v: 420 }])
  const [collect, setCollect] = useState(85)
  const now = useMemo(() => new Date(), [])
  const hist = monthlyRevenue(state, now, 3)
  const avg = hist.reduce((a, h) => a + h.revenue, 0) / Math.max(1, hist.length)
  const out = items.reduce((a, i) => a + i.v, 0)
  const flow = Array.from({ length: 6 }, (_, i) => ({ m: `+${i + 1}m`, net: Math.round((avg * Math.min(100, collect)) / 100 * 0.45 - out) }))
  let cum = 0
  const cumul = flow.map((f) => ({ ...f, cum: (cum += f.net) }))
  return (
    <div className="space-y-6">
      <Notice tone="future">Light demo analytics on fictional data. The cash-flow model is deliberately simple and <b>illustrative only</b> — not a forecast or financial advice.</Notice>
      <section>
        <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">Booked revenue by suburb</h3>
        <div className="mb-3 flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-slate-600">From<input type="date" className={`${inputCls} mt-1 !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs font-semibold text-slate-600">To<input type="date" className={`${inputCls} mt-1 !w-40`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        {rows.length === 0 ? <EmptyState title="No data in range" /> : (
          <div className="h-64 w-full" role="img" aria-label="Bar chart of booked revenue by suburb">
            <ResponsiveContainer><BarChart data={rows} margin={{ left: 4, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="suburb" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(Number(v))} /><Bar dataKey="revenue" name="Booked revenue" fill="#172566" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">Illustrative cash flow — recurring items</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it.n} className="grid grid-cols-2 items-center gap-2"><span className="text-sm">{it.n} <span className="text-xs text-slate-400">/ month</span></span><NumInput label={`${it.n} per month`} value={it.v} onCommit={(n) => setItems(items.map((x, j) => (j === i ? { ...x, v: n } : x)))} /></div>
            ))}
            <label className="grid grid-cols-2 items-center gap-2 text-sm"><span>Receipts collected on time (%)</span><NumInput label="Collection percentage" value={collect} onCommit={(n) => setCollect(Math.min(100, n))} /></label>
            <p className="text-xs text-slate-500">Model: average of last 3 months’ revenue × collection % × an assumed 45% contribution, minus recurring items. All numbers fictional.</p>
          </div>
          <div className="h-60 w-full" role="img" aria-label="Line chart of illustrative cumulative net cash flow">
            <ResponsiveContainer><LineChart data={cumul}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(Number(v))} /><Legend /><Line type="monotone" dataKey="cum" name="Cumulative net (illustrative)" stroke="#172566" strokeWidth={2} dot /></LineChart></ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  )
}

function FollowUp() {
  const { state, run } = useStore()
  const jobs = state.jobs.filter((j) => j.stage !== 'Declined' && atOrAfter(j.stage, 'Invoiced'))
  const [jobId, setJobId] = useState(jobs.find((j) => isPaidStage(j.stage))?.id ?? jobs[0]?.id ?? '')
  const job = jobs.find((j) => j.id === jobId)
  const client = findClient(state, job?.clientId)
  const buyer = client?.contacts.find((c) => c.id === job?.buyerContactId)
  const ok = !!client?.reviewConsent
  return (
    <div className="space-y-3">
      <Notice tone="mock" title="PREVIEW ONLY">Nothing is sent — no email, SMS or Google API. The review link below is a placeholder. A draft is only shown when the client's consent flag is set.</Notice>
      {jobs.length === 0 ? <EmptyState title="No invoiced jobs yet" /> : (
        <>
          <select className={`${inputCls} max-w-md`} aria-label="Job" value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.client} ({j.stage})</option>)}</select>
          {client && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              Consent for follow-up: {ok ? <Badge tone="green">recorded (demo flag)</Badge> : <Badge tone="red">not recorded</Badge>}
              <Button size="sm" onClick={() => run((s) => updateClient(s, client.id, { reviewConsent: !ok }), 'Consent flag updated (local)', 'info')}>{ok ? 'Withdraw consent' : 'Mark consent given'}</Button>
              <Link to={`/clients/${client.id}`} className="text-xs font-semibold text-brand-600">Client page</Link>
            </div>
          )}
          {ok && job ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed" aria-label="Draft message preview">
              <div className="text-xs text-slate-500">To: {buyer?.name ?? 'client'} {buyer?.email ? `<${buyer.email}>` : ''} · DRAFT — NOT SENT</div>
              <p className="mt-2">Hi {buyer?.name.split(' ')[0] ?? 'there'},</p>
              <p className="mt-2">Thanks for choosing Lion &amp; Co Scaffolding for {job.siteAddress}, {job.suburb}. If you were happy with the job, a quick Google review would mean a lot: <code className="rounded bg-white px-1 text-xs">https://example.com/review-placeholder</code></p>
              <p className="mt-2">Reply STOP to opt out. — Lion &amp; Co (demo text)</p>
            </div>
          ) : <Notice tone="warn" title="BLOCKED">No consent recorded for this client, so no follow-up draft is generated.</Notice>}
        </>
      )}
    </div>
  )
}
