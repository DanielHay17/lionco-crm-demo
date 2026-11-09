import { useState } from 'react'
import { Link } from 'react-router-dom'
import NumInput from '../NumInput'
import { Badge, Button, EmptyState, inputCls } from '../ui'
import { fmtDate, money } from '../../lib/format'
import { addVariation, decideVariation, jobVariations } from '../../lib/state'
import { isApprovedOrLater } from '../../lib/stages'
import type { Job } from '../../lib/types'
import { useStore } from '../../store/StoreProvider'

export default function VariationsTab({ job }: { job: Job }) {
  const { state, run } = useStore()
  const vars = jobVariations(state, job.id)
  const [desc, setDesc] = useState('')
  const [sell, setSell] = useState(0)
  const [cost, setCost] = useState(0)
  const [item, setItem] = useState('')
  const [qty, setQty] = useState('1')
  const allowed = job.stage !== 'Declined' && isApprovedOrLater(job.stage)
  const name = (id: string) => state.catalogue.find((c) => c.id === id)?.name ?? id
  const tone = { proposed: 'amber', approved: 'green', declined: 'red' } as const

  return (
    <div>
      <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
        Variations are changes after approval (extra lifts, kit changes). An <b>approved</b> variation updates the contract value and kit list; the packing checklist is then flagged out of date. Approving here is a simulated customer decision.
      </div>
      {vars.length === 0 ? (
        <EmptyState title="No variations">{allowed ? 'Record one below.' : 'Variations can be recorded once the job is approved.'}</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {vars.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold">{v.number}</span>
                  {v.quoteId && state.quotes.find((q) => q.id === v.quoteId) && <Link to={`/quotes/${v.quoteId}`} className="text-[11px] font-semibold text-brand-600">on {state.quotes.find((q) => q.id === v.quoteId)!.number}</Link>}
                  <Badge tone={tone[v.status]}>{v.status}</Badge>
                  <span className="text-[11px] text-slate-400">{fmtDate(v.createdAt)}</span>
                </div>
                <div className="font-medium text-slate-800">{v.description}</div>
                <div className="text-xs text-slate-500">
                  Sell {v.sellDelta >= 0 ? '+' : '−'}{money(Math.abs(v.sellDelta))} · est. cost {v.costDelta >= 0 ? '+' : '−'}{money(Math.abs(v.costDelta))}
                  {v.kitDeltas.length > 0 && ` · kit: ${v.kitDeltas.map((k) => `${k.qty > 0 ? '+' : ''}${k.qty} ${name(k.itemId)}`).join(', ')}`}
                </div>
              </div>
              {v.status === 'proposed' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => run((s, at) => decideVariation(s, v.id, 'approved', at), `${v.number} approved (simulated) — contract value updated`)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => run((s, at) => decideVariation(s, v.id, 'declined', at), `${v.number} declined`, 'info')}>Decline</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!desc.trim() || !allowed) return
          const n = Math.trunc(Number(qty))
          run(
            (s, at) => addVariation(s, job.id, { description: desc, sellDelta: sell, costDelta: cost, kitDeltas: item && Number.isFinite(n) && n !== 0 ? [{ itemId: item, qty: n }] : [] }, at),
            'Variation recorded as proposed',
          )
          setDesc('')
          setSell(0)
          setCost(0)
          setItem('')
        }}
      >
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
          New variation {allowed ? '' : '(available after approval)'}
          <input className={`${inputCls} mt-1`} disabled={!allowed} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Extra lift at the rear" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Sell change (AUD, may be negative)
          <NumInput label="Variation sell change" value={sell} min={-1e9} onCommit={setSell} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Estimated cost change
          <NumInput label="Variation cost change" value={cost} min={-1e9} onCommit={setCost} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Kit change (optional)
          <select className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} disabled={!allowed}>
            <option value="">No kit change</option>
            {state.catalogue.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Qty change (+ add / − remove)
          <input className={inputCls} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!item} />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={!allowed || !desc.trim()}>Record variation</Button>
        </div>
      </form>
    </div>
  )
}
