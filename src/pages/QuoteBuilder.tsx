import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Crumbs from '../components/Crumbs'
import DeclineModal from '../components/DeclineModal'
import Notice from '../components/Notice'
import NumInput from '../components/NumInput'
import QuoteBadge from '../components/QuoteBadge'
import SiteRecords from '../components/SiteRecords'
import { Button, Card, CardHeader, EmptyState, inputCls, ServiceBadge } from '../components/ui'
import { kitShortages } from '../lib/inventory'
import { money, money2, pct } from '../lib/format'
import { marginStatus } from '../lib/profit'
import { computeQuote, kitLines, labourLine, lineCost, lineSell, lineWeeks, newLineId, quoteCrew, quoteKit } from '../lib/quote'
import { approveQuote, findJob, findQuote, issueQuote, markDepositReceived, reviseQuote, updateQuote } from '../lib/state'
import type { Quote, QuoteLine } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function QuoteBuilder() {
  const { quoteId } = useParams()
  const store = useStore()
  const { state, run } = store
  const nav = useNavigate()
  const quote = findQuote(state, quoteId)
  const [draft, setDraft] = useState<Quote | undefined>(quote)
  const [dirty, setDirty] = useState(false)
  const [declineFor, setDeclineFor] = useState<string | null>(null)
  const [addItem, setAddItem] = useState('')

  useEffect(() => {
    setDraft(quote)
    setDirty(false)
  }, [quote?.id, quote?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const job = findJob(state, quote?.jobId)
  const q = draft ?? quote
  const totals = useMemo(() => (q ? computeQuote(q) : undefined), [q])
  if (!quote || !job || !q || !totals) return <Navigate to="/quotes" replace />

  const editable = quote.status === 'draft'
  const crew = quoteCrew(q, state.catalogue)
  const labour = labourLine(q, state.catalogue, state.settings)
  const shortages = kitShortages(state, quoteKit(q), job.id)
  const isActive = job.activeQuoteId === quote.id
  const change = (fn: (d: Quote) => Quote) => {
    setDraft((d) => fn(d ?? quote))
    setDirty(true)
  }
  const setLine = (id: string, p: Partial<QuoteLine>) => change((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) }))
  const removeLine = (id: string) => change((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== id) }))
  const save = () => {
    run((s) => updateQuote(s, q), 'Quote saved (local demo storage)')
    setDirty(false)
  }
  const unusedItems = state.catalogue.filter((c) => !q.lines.some((l) => l.itemId === c.id))
  const status = marginStatus({ profit: totals.profit, marginPct: totals.marginPct })
  const marginTone = { healthy: 'text-emerald-600', thin: 'text-amber-600', loss: 'text-red-600' }[status]

  return (
    <div>
      <Crumbs job={job} current={`Quote ${quote.number}`} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-ink px-2 py-1 font-mono text-xs font-bold text-white">{quote.number}</span>
            <QuoteBadge status={quote.status} />
            <ServiceBadge service={job.serviceType} drone={job.droneSurvey} />
            {!isActive && <span className="text-xs font-semibold text-slate-500">(older version)</span>}
          </div>
          <h1 className="font-display text-[26px] font-bold uppercase leading-tight tracking-[0.05em] text-ink">Quote · {job.client}</h1>
          <p className="text-sm text-slate-500">
            <Link to={`/jobs/${job.id}`} className="font-mono font-bold text-slate-700 hover:text-brand-600">
              {job.code}
            </Link>{' '}
            · {job.siteAddress}, {job.suburb} · Quote ref is a demo number, not a Xero number
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/quotes/${quote.id}/preview`} className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Customer preview / print
          </Link>
          {editable && (
            <>
              <Button disabled={!dirty} onClick={save}>
                {dirty ? 'Save quote' : 'Saved ✓'}
              </Button>
              <Button
                variant="primary"
                disabled={q.lines.length === 0 || totals.sell <= 0}
                title={q.lines.length === 0 || totals.sell <= 0 ? 'Add priced lines first' : 'Simulated: no email is sent'}
                onClick={() => {
                  run((s, at) => issueQuote(updateQuote(s, q), quote.id, at), `Quote ${quote.number} issued — SIMULATED, no email sent. Job moved to Quote stage.`)
                  setDirty(false)
                }}
              >
                Issue quote (simulated)
              </Button>
            </>
          )}
          {quote.status === 'issued' && isActive && (
            <>
              <Button variant="primary" onClick={() => {
                const s2 = run((s, at) => approveQuote(s, quote.id, at))
                store.toast(`Quote approved (simulated). Job moved to Approved; packing list ${s2.checklists[job.id] ? 'generated' : 'not generated (no kit lines)'}.`, { tone: 'success', action: s2.checklists[job.id] ? { label: 'Open packing', to: `/packing/${job.id}` } : undefined })
              }}>
                Customer approves (simulate)
              </Button>
              <Button variant="danger" onClick={() => setDeclineFor(job.id)}>
                Customer declines (simulate)
              </Button>
            </>
          )}
          {(quote.status === 'issued' || quote.status === 'declined') && isActive && (
            <Button
              onClick={() => {
                const r = reviseQuote(state, quote.id, new Date().toISOString())
                if (!r) return
                run(() => r.state, `Revised: ${r.quote.number} drafted`)
                nav(`/quotes/${r.quote.id}`)
              }}
            >
              Revise (new draft)
            </Button>
          )}
        </div>
      </div>

      <Notice tone="mock" title="SIMULATED" className="mb-4">
        Issue / approve / decline are local demo transitions. No email, Xero or customer portal is involved, and nothing leaves this browser.
        {!editable && ' This quote is locked — revise it for a new draft, or use variations once approved.'}
      </Notice>

      {quote.status === 'approved' && (
        <Notice tone="info" className="mb-4">
          Approved: the job's kit list was set from this quote and the packing checklist generated. Changes after approval are recorded as{' '}
          <Link to={`/jobs/${job.id}?tab=variations`} className="font-semibold underline">
            variations on the job
          </Link>
          .
        </Notice>
      )}
      {quote.status === 'declined' && quote.declineReason && <Notice tone="warn" className="mb-4">Declined: {quote.declineReason}</Notice>}

      {shortages.length > 0 && (
        <Notice tone="warn" title="STOCK SHORTAGE" className="mb-4">
          Approving this kit would exceed available stock (after other jobs' reservations):{' '}
          {shortages.map((x) => `${x.name} — need ${x.need}, ${Math.max(0, x.availableToThisJob)} available (short ${x.short})`).join('; ')}.{' '}
          <Link to="/catalogue" className="font-semibold underline">Check Kit & Inventory</Link>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Rental & crew inputs" sub="Kit is priced per unit per week; crew follows the spreadsheet-style formula (demo assumption)" />
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              <label className="block text-xs font-semibold text-slate-600">
                Hire period (weeks)
                <NumInput label="Hire period in weeks" value={q.hireWeeks} onCommit={(n) => change((d) => ({ ...d, hireWeeks: n }))} min={0} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Crew days
                <NumInput label="Crew days" value={q.crewDays} onCommit={(n) => change((d) => ({ ...d, crewDays: n }))} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Hours / person / day
                <NumInput label="Hours per person per day" value={q.hoursPerDay} onCommit={(n) => change((d) => ({ ...d, hoursPerDay: n }))} />
              </label>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200" aria-live="polite">
                <div className="text-slate-500">Total person-hours</div>
                <div className="tabular text-base font-bold text-ink">{crew.totalHours.toLocaleString('en-AU')} h</div>
                {crew.valid ? (
                  <div className="font-semibold text-slate-700">Crew: {crew.people} {crew.people === 1 ? 'person' : 'people'}</div>
                ) : (
                  <div className="font-semibold text-red-600">{crew.reason}</div>
                )}
              </div>
            </div>
            {editable && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
                <Button
                  size="sm"
                  disabled={!labour}
                  title={labour ? '' : crew.valid ? 'No kit hours to staff' : crew.reason}
                  onClick={() => labour && change((d) => ({ ...d, lines: [...d.lines.filter((l) => l.kind !== 'labour'), labour] }))}
                >
                  Apply crew formula → labour line
                </Button>
                <Button size="sm" onClick={() => change((d) => ({ ...d, lines: [...d.lines.filter((l) => l.kind !== 'kit'), ...kitLines(job.kit, state.catalogue)] }))} title="Replace kit lines with the job's kit list">
                  Reload kit from job
                </Button>
                <span className="text-[11px] text-slate-500">Labour cost assumes the crew is paid full days (people × days × hours).</span>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Quote lines"
              sub="Sell price is customer-facing; cost is internal only"
              right={
                editable ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <select className={`${inputCls} !w-48 !py-1.5`} value={addItem} onChange={(e) => setAddItem(e.target.value)} aria-label="Add kit item to quote">
                      <option value="">Add kit item…</option>
                      {unusedItems.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!addItem}
                      onClick={() => {
                        const it = state.catalogue.find((c) => c.id === addItem)!
                        change((d) => ({ ...d, lines: [...d.lines, { id: newLineId(), kind: 'kit', description: it.name, itemId: it.id, qty: 1, unitPrice: it.weeklyRentalPrice, unitCost: it.weeklyCost }] }))
                        setAddItem('')
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : undefined
              }
            />
            {q.lines.length === 0 ? (
              <EmptyState title="No lines yet">Add kit from the catalogue, or reload the job's kit list.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2">Line</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Sell / unit</th>
                      <th className="px-2 py-2 text-right">Cost / unit</th>
                      <th className="px-2 py-2 text-right">Sell total</th>
                      <th className="px-2 py-2 text-right">Cost total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {q.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{l.kind}</span>
                            {editable && l.kind !== 'kit' ? (
                              <input aria-label="Line description" className={`${inputCls} !py-1`} value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} />
                            ) : (
                              <span className="font-medium text-slate-800">{l.description}</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 pl-1 text-[10.5px] text-slate-400">
                            {l.kind === 'kit' ? (
                              editable ? (
                                <>
                                  per unit per week ×
                                  <span className="w-14"><NumInput label={`Rental weeks for ${l.description}`} value={lineWeeks(l, q.hireWeeks)} step={1} onCommit={(n) => setLine(l.id, { weeks: n === q.hireWeeks ? undefined : n })} className="!min-h-[28px] !py-0.5 !text-xs" /></span>
                                  wk{l.weeks !== undefined && <b className="text-brand-600">override</b>}
                                </>
                              ) : (
                                `per unit per week × ${lineWeeks(l, q.hireWeeks)} wk`
                              )
                            ) : l.kind === 'labour' ? 'per person-hour' : 'each'}
                          </div>
                        </td>
                        <td className="w-24 px-2 py-1.5">{editable ? <NumInput label={`Quantity for ${l.description}`} value={l.qty} onCommit={(n) => setLine(l.id, { qty: n })} /> : <span className="tabular block text-right">{l.qty}</span>}</td>
                        <td className="w-28 px-2 py-1.5">{editable ? <NumInput label={`Sell price for ${l.description}`} value={l.unitPrice} min={l.kind === 'other' ? -1e9 : 0} step={0.05} onCommit={(n) => setLine(l.id, { unitPrice: n })} /> : <span className="tabular block text-right">{money2(l.unitPrice)}</span>}</td>
                        <td className="w-28 px-2 py-1.5">{editable ? <NumInput label={`Cost for ${l.description}`} value={l.unitCost} step={0.05} onCommit={(n) => setLine(l.id, { unitCost: n })} /> : <span className="tabular block text-right">{money2(l.unitCost)}</span>}</td>
                        <td className="tabular px-2 py-1.5 text-right font-semibold">{money2(lineSell(l, q.hireWeeks))}</td>
                        <td className="tabular px-2 py-1.5 text-right text-slate-500">{money2(lineCost(l, q.hireWeeks))}</td>
                        <td className="px-2 text-right">
                          {editable && (
                            <button onClick={() => removeLine(l.id)} aria-label={`Remove ${l.description}`} className="min-h-[32px] rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {editable && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                <Button size="sm" onClick={() => change((d) => ({ ...d, lines: [...d.lines, { id: newLineId(), kind: 'transport', description: 'Truck delivery & collection', qty: 1, unitPrice: 0, unitCost: 0 }] }))}>
                  ＋ Transport
                </Button>
                <Button size="sm" onClick={() => change((d) => ({ ...d, lines: [...d.lines, { id: newLineId(), kind: 'other', description: 'Other expense / allowance', qty: 1, unitPrice: 0, unitCost: 0 }] }))}>
                  ＋ Other expense / charge
                </Button>
                <span className="self-center text-[11px] text-slate-500">Use a negative sell price on an “other” line for a discount.</span>
              </div>
            )}
          </Card>

          <SiteRecords job={job} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Price & profit" sub="Internal view — hidden from the customer preview" />
            <dl className="space-y-2 p-4 text-sm">
              <Line k="Sell price (revenue, ex GST)" v={money2(totals.sell)} bold />
              <Line k="Expense total (cost)" v={money2(totals.cost)} />
              <Line k="Profit" v={`${totals.profit < 0 ? '−' : ''}${money2(Math.abs(totals.profit))}`} cls={marginTone} bold />
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Margin <span className="text-[11px]">(profit ÷ revenue)</span></dt>
                <dd className={`tabular font-bold ${marginTone}`} data-testid="quote-margin">
                  {totals.marginDefined ? pct(totals.marginPct, 1) : 'n/a'}
                </dd>
              </div>
              {!totals.marginDefined && <p className="text-xs text-slate-500">No revenue yet, so margin is undefined (shown as n/a, not 0%).</p>}
            </dl>
            <div className="border-t border-slate-100 p-4 text-xs">
              <table className="w-full">
                <thead className="text-left text-[10.5px] uppercase text-slate-500">
                  <tr>
                    <th>Kind</th>
                    <th className="text-right">Sell</th>
                    <th className="text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(totals.byKind) as [string, { sell: number; cost: number }][]).map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-0.5 capitalize">{k}</td>
                      <td className="tabular text-right">{money(v.sell)}</td>
                      <td className="tabular text-right text-slate-500">{money(v.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Demo deposit (optional)" sub="Simulated — no payment is taken" />
            <div className="space-y-3 p-4 text-sm">
              <label className="flex min-h-[40px] items-center gap-2.5">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" disabled={!editable} checked={q.depositEnabled} onChange={(e) => change((d) => ({ ...d, depositEnabled: e.target.checked }))} />
                Request a deposit on approval
              </label>
              {q.depositEnabled && (
                <>
                  <label className="block text-xs font-semibold text-slate-600">
                    Deposit %
                    <NumInput label="Deposit percentage" value={q.depositPct} onCommit={(n) => change((d) => ({ ...d, depositPct: Math.min(100, n) }))} />
                  </label>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                    Deposit <b className="tabular">{money2(totals.deposit)}</b> · balance <b className="tabular">{money2(totals.balanceAfterDeposit)}</b>
                    {quote.depositReceivedAt && <div className="mt-1 font-semibold text-emerald-700">Deposit marked received (simulated)</div>}
                  </div>
                  {quote.status === 'approved' && !quote.depositReceivedAt && (
                    <Button size="sm" onClick={() => run((s, at) => markDepositReceived(s, quote.id, at), 'Deposit marked received (simulated)')}>
                      Mark deposit received (simulated)
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Linked records" />
            <ul className="space-y-1.5 p-4 text-sm">
              <li><Link className="font-semibold text-brand-600" to={`/jobs/${job.id}`}>Job {job.code}</Link></li>
              <li><Link className="font-semibold text-brand-600" to={`/clients/${job.clientId}`}>Client: {job.client}</Link></li>
              {state.checklists[job.id] ? <li><Link className="font-semibold text-brand-600" to={`/packing/${job.id}`}>Packing checklist</Link></li> : <li className="text-slate-500">Packing checklist is generated when the quote is approved.</li>}
            </ul>
          </Card>
        </div>
      </div>
      <DeclineModal jobId={declineFor} onClose={() => setDeclineFor(null)} />
    </div>
  )
}

function Line({ k, v, bold, cls = '' }: { k: string; v: string; bold?: boolean; cls?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className={`tabular ${bold ? 'font-bold' : 'font-medium'} ${cls}`}>{v}</dd>
    </div>
  )
}
