import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ExpenseModal from '../components/ExpenseModal'
import { Badge, Button, Card, CardHeader, ConfirmModal, inputCls, MarginBadge, marginColor, StageBadge, StageStepper } from '../components/ui'
import { checklistBalance, checklistProgress } from '../lib/checklist'
import { fmtDate, fmtDateTime, kg, money, money2, pct } from '../lib/format'
import { checklistIsStale, findJob, isCosted, jobExpenses, jobFinancials, stageIndex } from '../lib/state'
import { STAGES } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function JobDetail() {
  const { jobId } = useParams()
  const store = useStore()
  const { state } = store
  const job = findJob(state, jobId)
  const [quoteDraft, setQuoteDraft] = useState('')
  const [note, setNote] = useState('')
  const [expOpen, setExpOpen] = useState(false)
  const [addItem, setAddItem] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [confirmRegen, setConfirmRegen] = useState(false)

  useEffect(() => {
    if (job) setQuoteDraft(String(job.quote))
  }, [job?.id, job?.quote])

  if (!job) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-600">Job not found.</p>
        <Link to="/pipeline" className="mt-2 inline-block font-semibold text-amber-700">
          Back to pipeline
        </Link>
      </Card>
    )
  }

  const f = jobFinancials(state, job)
  const exps = jobExpenses(state, job.id).sort((a, b) => b.date.localeCompare(a.date))
  const checklist = state.checklists[job.id]
  const cat = new Map(state.catalogue.map((c) => [c.id, c]))
  const kitKg = job.kit.reduce((s, k) => s + (cat.get(k.itemId)?.unitWeightKg ?? 0) * k.qty, 0)
  const idx = stageIndex(job.stage)
  const person = (id: string) => state.people.find((p) => p.id === id)?.name ?? '—'
  const stale = checklistIsStale(state, job)
  const unusedItems = state.catalogue.filter((c) => !job.kit.some((k) => k.itemId === c.id))

  function commitQuote() {
    const n = Number(quoteDraft)
    if (Number.isFinite(n) && n >= 0 && n !== job!.quote) store.setQuote(job!.id, n)
    else setQuoteDraft(String(job!.quote))
  }

  return (
    <div>
      <div className="no-print mb-4 text-sm text-slate-500">
        <Link to="/pipeline" className="hover:text-slate-800">
          Pipeline
        </Link>{' '}
        / <span className="font-mono font-semibold text-slate-700">{job.code}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{job.client}</h1>
            <StageBadge stage={job.stage} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-mono font-bold text-slate-700">{job.code}</span> · {job.siteAddress}, {job.suburb}
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={idx === 0} onClick={() => store.stepJob(job.id, -1)}>
            ◀ Move back
          </Button>
          <Button variant="primary" disabled={idx === STAGES.length - 1} onClick={() => store.stepJob(job.id, 1)}>
            Move forward{idx < STAGES.length - 1 ? `: ${STAGES[idx + 1]}` : ''} ▶
          </Button>
        </div>
      </div>

      <Card className="mb-4 px-3 py-3">
        <StageStepper stage={job.stage} onSelect={(s) => store.moveJob(job.id, s)} />
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Money */}
          <Card>
            <CardHeader title="Quote & profit" sub={isCosted(job.stage) ? 'Profit = quote − expenses logged against this job code' : 'Costs appear once work starts — expenses logged so far are included'} />
            <div className="grid grid-cols-4 divide-x divide-slate-100">
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Quote (AUD)</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-lg font-bold text-slate-400">$</span>
                  <input
                    aria-label="Quote amount"
                    type="number"
                    min="0"
                    step="100"
                    value={quoteDraft}
                    onChange={(e) => setQuoteDraft(e.target.value)}
                    onBlur={commitQuote}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="tabular w-full rounded border border-transparent bg-transparent text-xl font-bold text-slate-900 hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">COGS (expenses)</div>
                <div className="tabular mt-1 text-xl font-bold text-slate-900">{money(f.cogs)}</div>
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Profit</div>
                <div className={`tabular mt-1 text-xl font-bold ${marginColor(f)}`}>
                  {f.profit < 0 ? '−' : ''}
                  {money(Math.abs(f.profit))}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Margin</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`tabular text-xl font-bold ${marginColor(f)}`}>{pct(f.marginPct, 1)}</span>
                  {isCosted(job.stage) && <MarginBadge f={f} compact />}
                </div>
              </div>
            </div>
          </Card>

          {/* Kit list */}
          <Card>
            <CardHeader
              title="Kit list"
              sub={`${job.kit.length} items · ${kg(kitKg)} total`}
              right={
                <div className="flex items-center gap-2">
                  <select className={`${inputCls} !w-64 !py-1.5`} value={addItem} onChange={(e) => setAddItem(e.target.value)} aria-label="Add kit item">
                    <option value="">Add item from catalogue…</option>
                    {unusedItems.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.unitWeightKg} kg)
                      </option>
                    ))}
                  </select>
                  <input type="number" min="1" className={`${inputCls} !w-16 !py-1.5`} value={addQty} onChange={(e) => setAddQty(e.target.value)} aria-label="Quantity to add" />
                  <Button
                    size="sm"
                    disabled={!addItem}
                    onClick={() => {
                      store.setKitQty(job.id, addItem, Math.max(1, Number(addQty) || 1))
                      setAddItem('')
                      setAddQty('1')
                    }}
                  >
                    Add
                  </Button>
                </div>
              }
            />
            {job.kit.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No kit yet — add items from the catalogue to build the kit list.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Unit kg</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Weight</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {job.kit.map((k) => {
                    const item = cat.get(k.itemId)
                    if (!item) return null
                    return (
                      <tr key={k.itemId}>
                        <td className="px-5 py-1.5 font-medium text-slate-800">{item.name}</td>
                        <td className="tabular px-3 py-1.5 text-right text-slate-500">{item.unitWeightKg}</td>
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="number"
                            min="0"
                            aria-label={`Quantity of ${item.name}`}
                            value={k.qty}
                            onChange={(e) => store.setKitQty(job.id, k.itemId, Number(e.target.value))}
                            className="tabular w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="tabular px-3 py-1.5 text-right text-slate-700">{kg(item.unitWeightKg * k.qty)}</td>
                        <td className="px-2 text-right">
                          <button onClick={() => store.setKitQty(job.id, k.itemId, 0)} aria-label={`Remove ${item.name}`} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader
              title="Expenses logged against this job"
              sub={`${exps.length} entries · ${money2(f.cogs)}`}
              right={
                <Button size="sm" variant="primary" onClick={() => setExpOpen(true)}>
                  ＋ Log expense
                </Button>
              }
            />
            {exps.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">No expenses yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2">Date</th>
                    <th className="px-3 py-2">What / where</th>
                    <th className="px-3 py-2">Who</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-5 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {exps.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-1.5 text-slate-500">{fmtDate(e.date)}</td>
                      <td className="px-3 py-1.5">
                        <div className="font-medium text-slate-800">{e.description}</div>
                        <div className="text-xs text-slate-500">{e.supplier}</div>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{person(e.personId)}</td>
                      <td className="px-3 py-1.5">
                        <Badge>{e.category}</Badge>
                      </td>
                      <td className="tabular px-5 py-1.5 text-right font-semibold">{money2(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Client & site" />
            <dl className="space-y-2.5 p-5 text-sm">
              <Row k="Client" v={job.client} />
              <Row k="Type" v={job.clientType} />
              <Row k="Contact" v={job.contactName || '—'} />
              <Row k="Phone" v={job.contactPhone || '—'} />
              <Row k="Email" v={job.contactEmail || '—'} />
              <Row k="Site" v={`${job.siteAddress}, ${job.suburb} NSW`} />
              <Row k="Created" v={fmtDate(job.createdAt)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Truck packing checklist" />
            <div className="p-5 text-sm">
              {checklist ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {checklistProgress(checklist).done}/{checklistProgress(checklist).total} lines ticked
                    </span>
                    {checklistBalance(checklist).status === 'warning' ? <Badge tone="red">Unbalanced</Badge> : <Badge tone="green">Balanced</Badge>}
                  </div>
                  {stale && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                      The kit list has changed since this checklist was generated.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Link
                      to={`/packing/${job.id}`}
                      className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Open checklist
                    </Link>
                    <Button onClick={() => setConfirmRegen(true)}>Regenerate</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-slate-500">
                  <p>
                    {idx < stageIndex('Approved')
                      ? 'Generated automatically when this job moves to Approved.'
                      : 'No checklist generated yet.'}
                  </p>
                  {job.kit.length > 0 && idx >= stageIndex('Approved') && (
                    <Button variant="primary" onClick={() => store.regenerateChecklist(job.id)}>
                      Generate checklist
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <div className="p-5">
              <form
                className="mb-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  store.addNote(job.id, note)
                  setNote('')
                }}
              >
                <input className={inputCls} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button type="submit" disabled={!note.trim()}>
                  Add
                </Button>
              </form>
              <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                {[...job.activity].reverse().map((a) => (
                  <li key={a.id} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                        a.kind === 'stage' ? 'bg-amber-500' : a.kind === 'note' ? 'bg-sky-500' : 'bg-slate-300'
                      }`}
                    />
                    <div className={`text-sm ${a.kind === 'stage' ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{a.text}</div>
                    <div className="text-[11px] text-slate-400">{fmtDateTime(a.at)}</div>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
      </div>

      <ExpenseModal open={expOpen} onClose={() => setExpOpen(false)} presetJobId={job.id} />
      <ConfirmModal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Regenerate packing checklist?"
        confirmLabel="Regenerate"
        message="This rebuilds the checklist from the current kit list, re-balances the truck zones and clears all tick-offs."
        onConfirm={() => store.regenerateChecklist(job.id)}
      />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  )
}
