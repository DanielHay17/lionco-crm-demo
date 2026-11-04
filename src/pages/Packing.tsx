import { Link } from 'react-router-dom'
import { Badge, Card, PageHeader, StageBadge } from '../components/ui'
import { checklistBalance, checklistProgress } from '../lib/checklist'
import { kg } from '../lib/format'
import { findJob } from '../lib/state'
import { useStore } from '../store/StoreProvider'

export default function Packing() {
  const { state } = useStore()
  const rows = Object.values(state.checklists)
    .map((c) => ({ c, job: findJob(state, c.jobId) }))
    .filter((r) => r.job)
    .sort((a, b) => b.job!.code.localeCompare(a.job!.code))

  return (
    <div>
      <PageHeader title="Truck Packing" subtitle="Checklists are generated automatically when a job moves to Approved" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Job</th>
              <th className="px-3 py-2.5">Client / site</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5">Progress</th>
              <th className="px-3 py-2.5">Truck balance</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ c, job }) => {
              const p = checklistProgress(c)
              const b = checklistBalance(c)
              return (
                <tr key={c.jobId} className="hover:bg-amber-50/40">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{job!.code}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{job!.client}</div>
                    <div className="text-xs text-slate-500">
                      {job!.siteAddress}, {job!.suburb}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StageBadge stage={job!.stage} />
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5 text-right font-semibold">{kg(b.totalKg)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full ${p.done === p.total ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                      </div>
                      <span className="tabular text-xs font-semibold text-slate-600">
                        {p.done}/{p.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {b.status === 'warning' ? (
                      <Badge tone="red" title={b.warnings.join(' ')}>
                        ⚠ Unbalanced · F/R {b.frontPct.toFixed(0)}/{b.rearPct.toFixed(0)} · L/R {b.leftPct.toFixed(0)}/{b.rightPct.toFixed(0)}
                      </Badge>
                    ) : (
                      <Badge tone="green">
                        ✓ Balanced · F/R {b.frontPct.toFixed(0)}/{b.rearPct.toFixed(0)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/packing/${c.jobId}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                      Open
                    </Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No checklists yet. Move a job to <b>Approved</b> on the Pipeline to generate one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
