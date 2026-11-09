import { Link } from 'react-router-dom'
import Notice from '../components/Notice'
import { Badge, Card, EmptyState, PageHeader, StageBadge } from '../components/ui'
import { InspectionBadge } from '../components/job/InspectionPanel'
import { fmtDate, ymd } from '../lib/format'
import { inspectionStatus } from '../lib/inspection'
import { atOrAfter, stageIndex } from '../lib/stages'
import { useStore } from '../store/StoreProvider'

const order = { overdue: 0, 'due-soon': 1, ok: 2, disabled: 3, 'not-applicable': 4 } as const

export default function SiteOverview() {
  const { state } = useStore()
  const today = ymd(new Date())
  const rows = state.jobs
    .filter((j) => j.stage !== 'Declined' && atOrAfter(j.stage, 'Approved') && stageIndex(j.stage) <= stageIndex('Warehouse return'))
    .map((j) => ({ j, st: inspectionStatus(j, state.settings.inspectionIntervalDays, today) }))
    .sort((a, b) => order[a.st.state] - order[b.st.state])
  return (
    <div>
      <PageHeader title="Site & Inspections" subtitle="Demo reminders and site-folder paperwork for jobs in the field" />
      <Notice tone="info" title="DEMO REMINDER" className="mb-4">
        Inspection reminders use a configurable {state.settings.inspectionIntervalDays}-day interval (change it on <Link to="/catalogue" className="font-semibold underline">Kit & Inventory</Link>). They are local, send nothing, and are <b>not legal or compliance guidance</b>. Forms are demo templates, not safety certificates.
      </Notice>
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Job</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Erected</th>
              <th className="px-3 py-2.5">Inspection</th>
              <th className="px-3 py-2.5">Neighbour consent</th>
              <th className="px-3 py-2.5">Handover</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ j }) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><div className="font-mono text-xs font-bold">{j.code}</div><div className="text-xs text-slate-500">{j.client} · {j.suburb}</div></td>
                <td className="px-3 py-2.5"><StageBadge stage={j.stage} /></td>
                <td className="px-3 py-2.5 text-slate-600">{j.dates.erectedAt ? fmtDate(j.dates.erectedAt) : '—'}</td>
                <td className="px-3 py-2.5"><InspectionBadge job={j} /> {j.inspections.length > 0 && <span className="text-xs text-slate-500">{j.inspections.length} record(s)</span>}</td>
                <td className="px-3 py-2.5">{j.siteDocs.neighbourConsent === 'required-pending' ? <Badge tone="amber">pending</Badge> : j.siteDocs.neighbourConsent === 'received' ? <Badge tone="green">received</Badge> : <span className="text-xs text-slate-400">n/a</span>}</td>
                <td className="px-3 py-2.5">{j.siteDocs.handoverSignedOff ? <Badge tone="green">signed off (noted)</Badge> : j.siteDocs.handoverPrintedAt ? <Badge>printed</Badge> : <span className="text-xs text-slate-400">—</span>}</td>
                <td className="px-4 py-2.5 text-right"><Link to={`/jobs/${j.id}?tab=site`} className="font-semibold text-brand-600">Open site tab</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}><EmptyState title="No jobs in the field" /></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
