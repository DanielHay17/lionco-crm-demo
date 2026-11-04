import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NewEnquiryModal from '../components/NewEnquiryModal'
import { Button, Card, inputCls, MarginBadge, PageHeader, StageBadge } from '../components/ui'
import { money } from '../lib/format'
import { isCosted, jobFinancials } from '../lib/state'
import { STAGES } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Jobs() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('')
  const [open, setOpen] = useState(false)
  const rows = useMemo(
    () =>
      [...state.jobs]
        .sort((a, b) => b.code.localeCompare(a.code))
        .filter((j) => (!stage || j.stage === stage) && `${j.code} ${j.client} ${j.siteAddress} ${j.suburb}`.toLowerCase().includes(q.toLowerCase())),
    [state.jobs, q, stage],
  )
  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Every job has a fixed, auto-generated code"
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            ＋ New enquiry
          </Button>
        }
      />
      <div className="mb-3 flex gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search code, client, suburb…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} max-w-[14rem]`} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Job code</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Site</th>
              <th className="px-4 py-2.5">Stage</th>
              <th className="px-4 py-2.5 text-right">Quote</th>
              <th className="px-4 py-2.5 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-amber-50/40">
                <td className="px-4 py-2.5">
                  <Link to={`/jobs/${j.id}`} className="font-mono text-xs font-bold text-slate-700 hover:text-amber-700">
                    {j.code}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{j.client}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {j.siteAddress}, {j.suburb}
                </td>
                <td className="px-4 py-2.5">
                  <StageBadge stage={j.stage} />
                </td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{money(j.quote)}</td>
                <td className="px-4 py-2.5 text-right">{isCosted(j.stage) ? <MarginBadge f={jobFinancials(state, j)} /> : <span className="text-xs text-slate-400">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No jobs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <NewEnquiryModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
