import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QuoteBadge from '../components/QuoteBadge'
import { Button, Card, EmptyState, Field, inputCls, Modal, PageHeader } from '../components/ui'
import { money, pct } from '../lib/format'
import { computeQuote } from '../lib/quote'
import { createQuote, findJob } from '../lib/state'
import type { QuoteStatus } from '../lib/types'
import { useStore } from '../store/StoreProvider'

const STATUSES: ('' | QuoteStatus)[] = ['', 'draft', 'issued', 'approved', 'declined', 'superseded']

export default function Quotes() {
  const { state, run } = useStore()
  const nav = useNavigate()
  const [status, setStatus] = useState<'' | QuoteStatus>('')
  const [open, setOpen] = useState(false)
  const [jobId, setJobId] = useState('')
  const rows = [...state.quotes].filter((q) => !status || q.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const eligible = state.jobs.filter((j) => j.stage !== 'Declined').sort((a, b) => b.seq - a.seq)

  function create() {
    const job = findJob(state, jobId)
    if (!job) return
    const r = createQuote(state, jobId, new Date().toISOString())
    if (!r) return
    run(() => r.state, r.state === state ? `${job.code} already has an active quote — opening it` : `Quote ${r.quote.number} drafted from the job's kit list`, 'success')
    setOpen(false)
    nav(`/quotes/${r.quote.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Built from a job's kit — issue, approve and decline are simulated and drive the job lifecycle"
        actions={<Button variant="primary" onClick={() => setOpen(true)}>＋ New quote</Button>}
      />
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {STATUSES.map((s) => (
          <button key={s || 'all'} aria-pressed={status === s} onClick={() => setStatus(s)} className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${status === s ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Quote ref (demo)</th>
              <th className="px-3 py-2.5">Client / site</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Sell (ex GST)</th>
              <th className="px-3 py-2.5 text-right">Margin</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((q) => {
              const job = findJob(state, q.jobId)!
              const t = computeQuote(q)
              return (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{q.number}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ink">{job.client}</div>
                    <div className="text-xs text-slate-500">{job.siteAddress}, {job.suburb}</div>
                  </td>
                  <td className="px-3 py-2.5"><QuoteBadge status={q.status} /></td>
                  <td className="tabular px-3 py-2.5 text-right font-semibold">{money(t.sell)}</td>
                  <td className="tabular px-3 py-2.5 text-right text-slate-600">{t.marginDefined ? pct(t.marginPct, 1) : 'n/a'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/quotes/${q.id}`} className="font-semibold text-brand-600">{q.status === 'draft' ? 'Edit' : 'Open'}</Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6}><EmptyState title="No quotes">Create one from a job's kit list.</EmptyState></td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="New quote">
        <div className="space-y-4">
          <Field label="Job" hint="The quote starts from this job's kit list. Need a new job first? Create the customer, then the job, then come back.">
            <select className={inputCls} value={jobId} onChange={(e) => setJobId(e.target.value)} autoFocus>
              <option value="">Choose a job…</option>
              {eligible.map((j) => (
                <option key={j.id} value={j.id}>{j.code} — {j.client}, {j.suburb} ({j.stage})</option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!jobId} onClick={create}>Create / open quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
