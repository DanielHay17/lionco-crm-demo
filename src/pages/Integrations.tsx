import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Notice, { StatusPill } from '../components/Notice'
import NumInput from '../components/NumInput'
import { Badge, Button, Card, EmptyState, inputCls, PageHeader, Tabs } from '../components/ui'
import { fmtDate, fmtDateTime, money, money2, ymd } from '../lib/format'
import { allocateCapture, dismissCapture, setSyncStatus, syncTransitions, toggleMigration } from '../lib/ops'
import { nextJobSeq, setJobCounter } from '../lib/state'
import { STAGE_COLOR, STAGE_HINT } from '../lib/stages'
import { EXPENSE_CATEGORIES, STAGES, type CaptureItem, type ExpenseCategory, type SyncStatus } from '../lib/types'
import { useStore } from '../store/StoreProvider'

type Tab = 'xero' | 'gmail' | 'whatsapp' | 'capture' | 'myob'
const TABS: Tab[] = ['xero', 'gmail', 'whatsapp', 'capture', 'myob']

export default function Integrations() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const q = params.get('tab') as Tab | null
  const tab: Tab = q && TABS.includes(q) ? q : 'xero'
  return (
    <div>
      <PageHeader title="Integration Centre" subtitle="What the connected systems would do — all simulated locally" />
      <Notice tone="mock" className="mb-4">
        <b>Every integration here is a mock and is disconnected.</b> There is no OAuth, no API connection, no credentials and no network call. Nothing is sent to Xero, Gmail, WhatsApp or MYOB; buttons only change data stored in this browser, and say “simulated”.
      </Notice>
      <Card>
        <Tabs
          value={tab}
          onChange={(t) => setParams({ tab: t })}
          tabs={[
            { id: 'xero', label: 'Xero', count: state.syncQueue.filter((s) => s.status === 'queued').length },
            { id: 'gmail', label: 'Gmail' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'capture', label: 'Expense capture', count: state.captureInbox.filter((c) => c.status === 'pending').length },
            { id: 'myob', label: 'MYOB migration' },
          ]}
        />
        <div className="p-5">
          {tab === 'xero' && <Xero />}
          {tab === 'gmail' && <Gmail />}
          {tab === 'whatsapp' && <WhatsApp />}
          {tab === 'capture' && <Capture />}
          {tab === 'myob' && <Myob />}
        </div>
      </Card>
    </div>
  )
}

const statusTone = { queued: 'amber', synced: 'slate', approved: 'green', declined: 'red', reconciled: 'dark' } as const
const actionLabel: Record<SyncStatus, string> = { queued: '', synced: 'Simulate sync to CRM', approved: 'Simulate approval in Xero', declined: 'Simulate decline in Xero', reconciled: 'Simulate reconciliation in Xero' }

function Xero() {
  const { state, run } = useStore()
  const paid = state.jobs.filter((j) => j.paidAt)
  const invoices = state.syncQueue.filter((s) => s.kind === 'invoice-draft')
  const reconciled = invoices.filter((i) => i.status === 'reconciled')
  const unreconciledPaid = paid.filter((j) => !reconciled.some((i) => i.jobId === j.id))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><StatusPill tone="mock">Xero: disconnected</StatusPill><span className="text-sm text-slate-600">Planned role: <b>accounting source of truth</b>. This app would keep operational data and push quotes / invoice drafts; payments and reconciliation live in Xero.</span></div>
      <Notice tone="info">Demo job numbers (<span className="font-mono">LC-…</span>) are a local simulation and are not Xero reference numbers.</Notice>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Queue item (mock)</th><th className="px-3 py-2">Job</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Simulate</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {state.syncQueue.map((it) => {
              const job = state.jobs.find((j) => j.id === it.jobId)
              const next = syncTransitions(it.kind, it.status)
              return (
                <tr key={it.id}>
                  <td className="px-3 py-2"><div className="font-medium">{it.kind === 'quote-sync' ? 'Quote → CRM' : 'Invoice draft'}</div><div className="text-xs text-slate-500">{it.summary}</div></td>
                  <td className="px-3 py-2">{job && <Link to={`/jobs/${job.id}`} className="font-mono text-xs font-bold text-brand-600">{job.code}</Link>}</td>
                  <td className="tabular px-3 py-2 text-right">{money(it.amount)}</td>
                  <td className="px-3 py-2"><Badge tone={statusTone[it.status]}>{it.status} (simulated)</Badge><div className="text-[11px] text-slate-400">{fmtDateTime(it.updatedAt)}</div></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {next.map((n) => <Button key={n} size="sm" variant={n === 'declined' ? 'danger' : 'secondary'} onClick={() => run((s, at) => setSyncStatus(s, it.id, n, at), `${actionLabel[n]} — local state only`, 'info')}>{actionLabel[n]}</Button>)}
                      {next.length === 0 && <span className="text-xs text-slate-400">no further steps</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {state.syncQueue.length === 0 && <tr><td colSpan={5}><EmptyState title="Queue is empty">Issuing a quote or moving a job to Invoiced adds a mock item.</EmptyState></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
        <div className="font-semibold text-ink">Reconciliation view (simulated)</div>
        <p className="mt-1 text-slate-600">{reconciled.length} of {invoices.length} invoice drafts reconciled · {paid.length} paid jobs, {unreconciledPaid.length} without a reconciled invoice.</p>
        {unreconciledPaid.length > 0 && <p className="mt-1 text-xs text-amber-800">Paid in the CRM but not reconciled (mock): {unreconciledPaid.map((j) => j.code).join(', ')}. In a real setup Xero would be the place to confirm payment.</p>}
      </div>
    </div>
  )
}

function Gmail() {
  const { state } = useStore()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><StatusPill tone="mock">Gmail: placeholder</StatusPill><span className="text-sm text-slate-600">Idea: log client emails against the client record.</span></div>
      <Notice tone="mock">Not connected — no mailbox access, no OAuth, no matching of real emails. Per-client entries below are demo data (you can add more on each client page).</Notice>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
        {state.clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <Link to={`/clients/${c.id}`} className="font-medium text-ink hover:text-brand-600">{c.name}</Link>
            <span className="text-xs text-slate-500">{c.emailLog.length} demo log entr{c.emailLog.length === 1 ? 'y' : 'ies'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WhatsApp() {
  const { state } = useStore()
  const subs = state.people.filter((p) => p.role === 'Subcontractor')
  const jobs = state.jobs.filter((j) => j.stage !== 'Declined' && j.stage !== 'Enquiry')
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '')
  const [subId, setSubId] = useState(subs[0]?.id ?? '')
  const [schem, setSchem] = useState(true)
  const [copied, setCopied] = useState(false)
  const job = jobs.find((j) => j.id === jobId)
  const sub = subs.find((s) => s.id === subId)
  const text = job && sub ? `Hi ${sub.name.split(' ')[0]} — invite to job ${job.code} (${job.suburb}).\nStage: ${job.stage}.${job.dates.buildDate ? `\nBuild: ${fmtDate(job.dates.buildDate)}` : ''}${job.dates.takedownDate ? `\nTakedown: ${fmtDate(job.dates.takedownDate)}` : ''}\nSite: ${job.siteAddress}, ${job.suburb}${job.siteNotes ? `\nNotes: ${job.siteNotes.slice(0, 160)}` : ''}${schem ? '\n[Schematic placeholder — nothing is attached in this demo]' : ''}\nReply YES to confirm. (PREVIEW ONLY — NOT SENT)` : ''
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><StatusPill tone="mock">WhatsApp Business: mock</StatusPill><StatusPill tone="future">Feasibility unconfirmed</StatusPill></div>
      <Notice tone="warn" title="NOT VERIFIED">Whether WhatsApp Business can support stage labels, subcontractor invites or schematic sharing for this workflow has <b>not been confirmed</b> (account type, API access, template approval, group handling). This tab is a concept preview — <b>nothing is sent</b>.</Notice>
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">Mocked stage labels</h3>
          <ul className="space-y-1">
            {STAGES.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm" title={STAGE_HINT[s]}>
                <span className="h-3 w-3 rounded-full" style={{ background: STAGE_COLOR[s] }} />
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">LC · {s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Idea: a chat label that follows the job stage. Labels here are text only.</p>
        </section>
        <section>
          <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">Subcontractor invite — chat preview</h3>
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <select className={inputCls} aria-label="Job" value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.client}</option>)}</select>
            <select className={inputCls} aria-label="Subcontractor" value={subId} onChange={(e) => setSubId(e.target.value)}>{subs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <label className="mb-2 flex min-h-[36px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={schem} onChange={(e) => setSchem(e.target.checked)} /> Include schematic-sharing placeholder</label>
          <div className="rounded-xl bg-[#e7efe3] p-3">
            <div className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-lg rounded-tr-none bg-white p-3 text-sm shadow-sm" aria-label="Chat message preview">{text || 'Pick a job and a subcontractor.'}</div>
            <div className="mt-1 text-right text-[10px] font-semibold uppercase tracking-wide text-red-700">preview — not sent</div>
          </div>
          <Button size="sm" className="mt-2" disabled={!text} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard unavailable */ } }}>{copied ? 'Copied to clipboard ✓' : 'Copy preview text (local clipboard only)'}</Button>
        </section>
      </div>
    </div>
  )
}

function Capture() {
  const { state, run } = useStore()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><StatusPill tone="mock">Capture exceptions: mock</StatusPill></div>
      <Notice tone="warn" title="EXCEPTION CASE">Supplier receipts sometimes arrive as a <b>hyperlink only</b> (no attachment), or the automatic forward to the bills inbox <b>fails</b>. Those can't be captured automatically, so they land here for a person to allocate to a job and reconcile. Nothing here is fetched or forwarded — the links are plain fictional text.</Notice>
      <ul className="space-y-3">
        {state.captureInbox.map((c) => <CaptureCard key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onDone={() => setOpen(null)} run={run} />)}
        {state.captureInbox.length === 0 && <EmptyState title="Inbox empty" />}
      </ul>
    </div>
  )
}

function CaptureCard({ c, open, onToggle, onDone, run }: { c: CaptureItem; open: boolean; onToggle: () => void; onDone: () => void; run: ReturnType<typeof useStore>['run'] }) {
  const { state } = useStore()
  const [jobId, setJobId] = useState('')
  const [personId, setPersonId] = useState(state.people[0]?.id ?? '')
  const [cat, setCat] = useState<ExpenseCategory>('Materials')
  const [amount, setAmount] = useState(c.amountHint ?? 0)
  const [desc, setDesc] = useState(c.subject)
  const [err, setErr] = useState('')
  const jobs = useMemo(() => [...state.jobs].filter((j) => j.stage !== 'Declined').sort((a, b) => b.seq - a.seq), [state.jobs])
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{c.supplier}</span>
            <Badge tone={c.issue === 'hyperlink-only' ? 'amber' : 'red'}>{c.issue === 'hyperlink-only' ? 'hyperlink only — no attachment' : 'forwarding failed'}</Badge>
            <Badge tone={c.status === 'pending' ? 'amber' : c.status === 'allocated' ? 'green' : 'slate'}>{c.status === 'pending' ? 'pending human allocation' : c.status}</Badge>
          </div>
          <div className="text-sm text-slate-600">{c.subject}</div>
          {c.link && <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{c.link} <span className="text-slate-400">(text only — not a live link)</span></code>}
          <div className="text-[11px] text-slate-400">Received {fmtDateTime(c.receivedAt)} · {c.amountHint ? `amount hint ${money2(c.amountHint)}` : 'no amount detected'}</div>
        </div>
        {c.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={onToggle}>{open ? 'Close' : 'Allocate…'}</Button>
            <Button size="sm" onClick={() => run((s) => dismissCapture(s, c.id), 'Dismissed (local)', 'info')}>Dismiss</Button>
          </div>
        )}
        {c.status === 'allocated' && c.expenseId && <Link to="/expenses" className="text-sm font-semibold text-brand-600">View in expenses</Link>}
      </div>
      {open && (
        <form
          className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const next = allocateCapture(state, c.id, { jobId, personId, category: cat, amount, description: desc, date: ymd(new Date()) }, new Date().toISOString())
            if (next === state) return setErr('Choose a job, a person, a description and an amount above 0.')
            run(() => next, 'Allocated by a person to the job — expense added to the local log (still needs real reconciliation in Xero)')
            onDone()
          }}
        >
          <select className={inputCls} aria-label="Job code" value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Choose job code…</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.client}</option>)}</select>
          <select className={inputCls} aria-label="Who" value={personId} onChange={(e) => setPersonId(e.target.value)}>{state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className={inputCls} aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>
          <NumInput label="Amount ex GST" value={amount} step={0.01} onCommit={setAmount} />
          <input className={`${inputCls} sm:col-span-2`} aria-label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          {err && <p className="text-sm font-medium text-red-600 sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2"><Button type="submit" variant="primary">Allocate to job</Button></div>
        </form>
      )}
    </li>
  )
}

function Myob() {
  const { state, run } = useStore()
  const groups = [...new Set(state.migrationChecklist.map((m) => m.group))]
  const done = state.migrationChecklist.filter((m) => m.done).length
  const min = nextJobSeq(state)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><StatusPill tone="mock">Planning checklist only</StatusPill><span className="text-sm text-slate-600">{done}/{state.migrationChecklist.length} planning steps ticked</span></div>
      <Notice tone="mock">No data is imported or exported and no MYOB / Xero connection exists. This is a planning aid for moving customers, vendors and job numbers from MYOB; ticks are stored locally.</Notice>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g} className="rounded-lg border border-slate-200 p-3">
            <h3 className="mb-1 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">{g}</h3>
            {state.migrationChecklist.filter((m) => m.group === g).map((m) => (
              <label key={m.id} className="flex min-h-[40px] items-start gap-2.5 py-1.5 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={m.done} onChange={() => run((s) => toggleMigration(s, m.id))} />
                <span className={m.done ? 'text-slate-400 line-through' : 'text-slate-700'}>{m.label}</span>
              </label>
            ))}
          </section>
        ))}
      </div>
      <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="font-semibold text-ink">Job sequence planner (local simulation)</div>
        <p className="mt-1 text-sm text-slate-600">Highest demo number used: <b>#{min - 1}</b> · next job will be <b className="font-mono">#{state.jobCounter >= min ? state.jobCounter : min}</b>. To plan a hand-over from MYOB numbering, you can move the next local number forward (never backwards — numbers are never reused).</p>
        <label className="mt-2 block max-w-[12rem] text-xs font-semibold text-slate-600">Next job sequence number
          <NumInput label="Next job sequence number" integer min={min} value={Math.max(state.jobCounter, min)} onCommit={(n) => run((s) => setJobCounter(s, n), `Next demo job number set to #${n} (local only)`)} />
        </label>
      </div>
    </div>
  )
}
