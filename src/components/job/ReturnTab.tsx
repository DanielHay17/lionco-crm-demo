import { Link } from 'react-router-dom'
import { Badge, Button, EmptyState } from '../ui'
import { returnComplete, setReturned } from '../../lib/state'
import type { Job } from '../../lib/types'
import { useStore } from '../../store/StoreProvider'

/** Warehouse return / unpack checklist — reuses the packing checklist lines and records what came back. */
export default function ReturnTab({ job }: { job: Job }) {
  const { state, run } = useStore()
  const c = state.checklists[job.id]
  if (!c) {
    return <EmptyState title="No packing list to return against">The return checklist reuses the packing checklist, which is generated when the quote is approved with kit.</EmptyState>
  }
  const checked = c.lines.filter((l) => c.returned?.[l.id] !== undefined).length
  const short = c.lines.reduce((a, l) => (c.returned?.[l.id] === undefined ? a : a + Math.max(0, l.qty - (c.returned[l.id] ?? 0))), 0)
  const done = returnComplete(c)
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {done ? <Badge tone="green">✓ Unpacked & complete</Badge> : <Badge tone="amber">{checked}/{c.lines.length} lines checked</Badge>}
          {short > 0 && <Badge tone="red">{short} unit(s) short / damaged</Badge>}
          <span className="text-xs text-slate-500">Record only — stock counts on Kit & Inventory are not auto-adjusted.</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => run((s, at) => c.lines.reduce((acc, l) => (acc.checklists[job.id].returned?.[l.id] === undefined ? setReturned(acc, job.id, l.id, l.qty, at) : acc), s), 'All remaining lines marked returned in full')}>
            Mark all returned in full
          </Button>
          <Link to={`/packing/${job.id}`} className="inline-flex min-h-[32px] items-center rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Packing sheet</Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-2">Item</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2 text-right">Packed</th>
              <th className="px-3 py-2 text-right">Returned</th>
              <th className="px-5 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {c.lines.map((l) => {
              const r = c.returned?.[l.id]
              return (
                <tr key={l.id}>
                  <td className="px-5 py-1.5 font-medium">{l.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{l.zone}</td>
                  <td className="tabular px-3 py-1.5 text-right">{l.qty}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      aria-label={`Returned quantity of ${l.name} (${l.zone})`}
                      value={r ?? ''}
                      placeholder="—"
                      onChange={(e) => run((s, at) => setReturned(s, job.id, l.id, e.target.value === '' ? undefined : Number(e.target.value), at))}
                      className="tabular min-h-[36px] w-20 rounded border border-slate-300 px-2 py-1 text-right focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </td>
                  <td className="px-5 py-1.5 text-xs">
                    {r === undefined ? <span className="text-slate-400">not checked</span> : r >= l.qty ? <span className="font-semibold text-emerald-700">complete</span> : <span className="font-semibold text-red-600">short {l.qty - r}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
