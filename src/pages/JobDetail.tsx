import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Crumbs from '../components/Crumbs'
import DeclineModal from '../components/DeclineModal'
import Notice from '../components/Notice'
import { InspectionBadge } from '../components/job/InspectionPanel'
import QuoteTab from '../components/job/QuoteTab'
import ReturnTab from '../components/job/ReturnTab'
import SiteTab from '../components/job/SiteTab'
import VariationsTab from '../components/job/VariationsTab'
import ExpenseModal from '../components/ExpenseModal'
import TruckDiagram from '../components/TruckDiagram'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmModal,
  EmptyState,
  inputCls,
  MarginBadge,
  marginColor,
  ServiceBadge,
  StageBadge,
  StageStepper,
  Tabs,
} from '../components/ui'
import { checklistBalance, checklistProgress } from '../lib/checklist'
import { fmtDate, fmtDateTime, kg, money, money2, pct } from '../lib/format'
import { marginStatus } from '../lib/profit'
import { contactOf, findClient } from '../lib/clients'
import { dateOnly } from '../lib/dates'
import { kitShortages } from '../lib/inventory'
import { setJobContacts, updateJobSite } from '../lib/ops'
import { computeQuote } from '../lib/quote'
import { activeQuote, checklistIsStale, findJob, jobExpenses, jobFinancials, setJobDate, stageWarnings } from '../lib/state'
import { isCosted, neighbourStage, stageIndex, STAGE_HINT } from '../lib/stages'
import { useStore } from '../store/StoreProvider'

type Tab = 'kit' | 'quote' | 'variations' | 'expenses' | 'packing' | 'return' | 'site' | 'activity'
const TABS: Tab[] = ['kit', 'quote', 'variations', 'expenses', 'packing', 'return', 'site', 'activity']

export default function JobDetail() {
  const { jobId } = useParams()
  const store = useStore()
  const { state } = store
  const job = findJob(state, jobId)
  const [params, setParams] = useSearchParams()
  const qTab = params.get('tab') as Tab | null
  const tab: Tab = qTab && TABS.includes(qTab) ? qTab : 'kit'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [declineOpen, setDeclineOpen] = useState(false)
  const [editSite, setEditSite] = useState(false)
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
      <Card>
        <EmptyState
          title="Job not found"
          action={
            <Link to="/pipeline" className="font-semibold text-brand-600">
              ← Back to pipeline
            </Link>
          }
        />
      </Card>
    )
  }

  const f = jobFinancials(state, job)
  const exps = jobExpenses(state, job.id).sort((a, b) => b.date.localeCompare(a.date))
  const checklist = state.checklists[job.id]
  const cat = new Map(state.catalogue.map((c) => [c.id, c]))
  const kitKg = job.kit.reduce((s, k) => s + (cat.get(k.itemId)?.unitWeightKg ?? 0) * k.qty, 0)
  const idx = stageIndex(job.stage)
  const back = neighbourStage(job.stage, -1)
  const fwd = neighbourStage(job.stage, 1)
  const client = findClient(state, job.clientId)
  const buyer = contactOf(client, job.buyerContactId)
  const siteMgr = contactOf(client, job.siteContactId)
  const quoteObj = activeQuote(state, job)
  const quoteTotals = quoteObj ? computeQuote(quoteObj) : undefined
  const shortages = kitShortages(state, job.kit, job.id)
  const nextWarn = fwd ? stageWarnings(state, job, fwd) : []
  const person = (id: string) => state.people.find((p) => p.id === id)?.name ?? '—'
  const stale = checklistIsStale(state, job)
  const unusedItems = state.catalogue.filter((c) => !job.kit.some((k) => k.itemId === c.id))
  const status = marginStatus(f)
  const barColor = { healthy: 'bg-emerald-500', thin: 'bg-amber-500', loss: 'bg-red-500' }[status]
  const barMax = Math.max(f.quote, f.cogs, 1)

  function commitQuote() {
    const n = Number(quoteDraft)
    if (Number.isFinite(n) && n >= 0 && n !== job!.quote) store.setQuote(job!.id, n)
    else setQuoteDraft(String(job!.quote))
  }

  return (
    <div>
      <Crumbs job={job} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-ink px-2 py-1 font-mono text-xs font-bold tracking-wide text-white" data-testid="job-code">
              {job.code}
            </span>
            <StageBadge stage={job.stage} />
            <ServiceBadge service={job.serviceType} drone={job.droneSurvey} />
            <InspectionBadge job={job} />
          </div>
          <h1 className="font-display text-[28px] font-bold uppercase leading-tight tracking-[0.05em] text-ink">{job.client}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {job.siteAddress}, {job.suburb} NSW
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!back} onClick={() => store.stepJob(job.id, -1)}>
            ◀ {job.stage === 'Declined' ? 'Re-open: Enquiry' : 'Move back'}
          </Button>
          <Button variant="primary" disabled={!fwd} onClick={() => store.stepJob(job.id, 1)}>
            {job.stage === 'Declined' ? `Re-open: ${fwd}` : `Move forward${fwd ? `: ${fwd}` : ''}`} ▶
          </Button>
          {stageIndex(job.stage) <= stageIndex('Approved') && job.stage !== 'Declined' && (
            <Button variant="danger" onClick={() => setDeclineOpen(true)}>Decline</Button>
          )}
        </div>
      </div>

      <Card className="mb-3 px-3 py-3">
        <StageStepper stage={job.stage} onSelect={(s) => store.moveJob(job.id, s)} />
        <p className="mt-1 px-1 text-xs text-slate-500">{STAGE_HINT[job.stage]}</p>
      </Card>
      {(nextWarn.length > 0 || shortages.length > 0) && (
        <div className="mb-3 space-y-2">
          {nextWarn.length > 0 && <Notice tone="warn" title={`BEFORE ${fwd?.toUpperCase()}`}>{nextWarn.join('; ')}.</Notice>}
          {shortages.length > 0 && job.stage !== 'Declined' && stageIndex(job.stage) <= stageIndex('Approved') && (
            <Notice tone="warn" title="STOCK SHORTAGE">
              {shortages.map((x) => `${x.name}: need ${x.need}, ${Math.max(0, x.availableToThisJob)} available`).join('; ')}. <Link to="/catalogue" className="font-semibold underline">Kit & Inventory</Link>
            </Notice>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Money */}
          <Card>
            <CardHeader
              title="Quote & profit"
              sub={isCosted(job.stage) ? 'Profit = quote − expenses logged against this job code' : 'Costs appear once work starts — expenses logged so far are included'}
              right={isCosted(job.stage) ? <MarginBadge f={f} compact /> : undefined}
            />
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Quote value (AUD ex GST)</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-lg font-bold text-slate-400">$</span>
                  <input
                    aria-label="Quote amount"
                    disabled={!!job.activeQuoteId}
                    title={job.activeQuoteId ? 'Value is driven by the quote builder' : undefined}
                    type="number"
                    min="0"
                    step="100"
                    value={quoteDraft}
                    onChange={(e) => setQuoteDraft(e.target.value)}
                    onBlur={commitQuote}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="tabular w-full rounded border border-transparent bg-transparent text-xl font-bold text-ink hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none disabled:hover:border-transparent"
                  />
                </div>
                {quoteObj && <div className="mt-0.5 text-[11px] text-slate-500">from <Link to={`/quotes/${quoteObj.id}`} className="font-semibold text-brand-600">{quoteObj.number}</Link>{quoteObj.status === 'approved' ? ' + approved variations' : ''}</div>}
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">COGS (expenses)</div>
                <div className="tabular mt-1 text-xl font-bold text-ink">{money(f.cogs)}</div>
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Profit</div>
                <div className={`tabular mt-1 text-xl font-bold ${marginColor(f)}`} data-testid="job-profit">
                  {f.profit < 0 ? '−' : ''}
                  {money(Math.abs(f.profit))}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs font-semibold text-slate-500">Margin</div>
                <div className={`tabular mt-1 text-xl font-bold ${marginColor(f)}`}>{pct(f.marginPct, 1)}</div>
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span>
                  COGS <b className="tabular text-slate-700">{money(f.cogs)}</b> of <b className="tabular text-slate-700">{money(f.quote)}</b> quote
                </span>
                <span className="tabular font-semibold text-slate-700">{f.quote > 0 ? pct((f.cogs / f.quote) * 100) : '—'} of quote spent</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-200" role="img" aria-label="COGS compared with quote">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${(f.cogs / barMax) * 100}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `calc(${(f.quote / barMax) * 100}% - 1px)` }} title="Quote value" />
              </div>
              <div className="mt-1 flex justify-end text-[10.5px] text-slate-400">▎ marks quote value</div>
              {quoteTotals && (
                <p className="mt-2 text-xs text-slate-500">
                  Quoted expense estimate <b className="tabular text-slate-700">{money(quoteTotals.cost)}</b> vs logged so far <b className="tabular text-slate-700">{money(f.cogs)}</b>
                  {f.cogs > quoteTotals.cost ? <span className="font-semibold text-red-600"> — over the quoted estimate</span> : ''}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'kit', label: 'Kit', count: job.kit.length },
                { id: 'quote', label: 'Quote', count: state.quotes.filter((q) => q.jobId === job.id).length },
                { id: 'variations', label: 'Variations', count: state.variations.filter((v) => v.jobId === job.id).length },
                { id: 'expenses', label: 'Expenses', count: exps.length },
                { id: 'packing', label: 'Packing' },
                { id: 'return', label: 'Return' },
                { id: 'site', label: 'Site' },
                { id: 'activity', label: 'Activity', count: job.activity.length },
              ]}
            />

            {tab === 'kit' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {job.kit.length} items · <b className="text-slate-700">{kg(kitKg)}</b> total
                  </p>
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
                      variant="primary"
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
                </div>
                {job.kit.length === 0 ? (
                  <EmptyState title="No kit yet">Add items from the catalogue to build the kit list. The packing checklist is generated from it.</EmptyState>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
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
                          <tr key={k.itemId} className="hover:bg-slate-50/70">
                            <td className="px-5 py-1.5 font-medium text-slate-800">{item.name}</td>
                            <td className="tabular px-3 py-1.5 text-right text-slate-500">{item.unitWeightKg}</td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="number"
                                min="0"
                                aria-label={`Quantity of ${item.name}`}
                                value={k.qty}
                                onChange={(e) => store.setKitQty(job.id, k.itemId, Number(e.target.value))}
                                className="tabular w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
              </div>
            )}

            {tab === 'quote' && <QuoteTab job={job} />}
            {tab === 'variations' && <VariationsTab job={job} />}
            {tab === 'return' && <ReturnTab job={job} />}
            {tab === 'site' && <SiteTab job={job} />}

            {tab === 'expenses' && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {exps.length} entries · <b className="tabular text-slate-700">{money2(f.cogs)}</b>
                  </p>
                  <Button size="sm" variant="primary" onClick={() => setExpOpen(true)}>
                    ＋ Log expense
                  </Button>
                </div>
                {exps.length === 0 ? (
                  <EmptyState title="No expenses yet">Costs logged against {job.code} show up here and roll straight into profit.</EmptyState>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
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
                        <tr key={e.id} className="hover:bg-slate-50/70">
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
              </div>
            )}

            {tab === 'packing' && (
              <div className="p-5">
                {checklist ? (
                  <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        {checklistBalance(checklist).status === 'warning' ? <Badge tone="red">⚠ Unbalanced</Badge> : <Badge tone="green">✓ Balanced</Badge>}
                        <span className="text-slate-600">
                          {checklistProgress(checklist).done}/{checklistProgress(checklist).total} lines ticked · {kg(checklistBalance(checklist).totalKg)}
                        </span>
                      </div>
                      {stale && (
                        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">The kit list has changed since this checklist was generated.</p>
                      )}
                      <div className="flex gap-2">
                        <Link to={`/packing/${job.id}`} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700">
                          Open checklist
                        </Link>
                        <Button onClick={() => setConfirmRegen(true)}>Regenerate</Button>
                      </div>
                    </div>
                    <TruckDiagram balance={checklistBalance(checklist)} compact />
                  </div>
                ) : (
                  <EmptyState
                    title="No packing checklist yet"
                    action={
                      job.kit.length > 0 && idx >= stageIndex('Approved') ? (
                        <Button variant="primary" onClick={() => store.regenerateChecklist(job.id)}>
                          Generate checklist
                        </Button>
                      ) : undefined
                    }
                  >
                    {idx < stageIndex('Approved') ? 'Generated automatically when this job moves to Approved.' : 'Add kit items first, then generate the checklist.'}
                  </EmptyState>
                )}
              </div>
            )}

            {tab === 'activity' && (
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
                  <Button type="submit" variant="primary" disabled={!note.trim()}>
                    Add note
                  </Button>
                </form>
                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                  {[...job.activity].reverse().map((a) => (
                    <li key={a.id} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          a.kind === 'stage' ? 'bg-brand-600' : a.kind === 'note' ? 'bg-sky-500' : 'bg-slate-300'
                        }`}
                      />
                      <div className={`text-sm ${a.kind === 'stage' ? 'font-semibold text-ink' : 'text-slate-700'}`}>{a.text}</div>
                      <div className="text-[11px] text-slate-400">{fmtDateTime(a.at)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Client & site" right={<button className="min-h-[32px] px-1 text-xs font-semibold text-brand-600" onClick={() => setEditSite((v) => !v)}>{editSite ? 'Done' : 'Edit'}</button>} />
            <dl className="space-y-2.5 p-5 text-sm">
              <Row k="Client" v={job.client} link={client ? `/clients/${client.id}` : undefined} />
              <Row k="Type" v={job.clientType} />
              <Row k="Service" v={job.droneSurvey && job.serviceType !== 'Drone Services' ? `${job.serviceType} + drone survey` : job.serviceType} />
              <Row k="Buyer" v={buyer ? `${buyer.name}${buyer.phone ? ' · ' + buyer.phone : ''}` : '—'} />
              <Row k="Site manager" v={siteMgr ? `${siteMgr.name}${siteMgr.phone ? ' · ' + siteMgr.phone : ''}` : '—'} />
              <Row k="Site" v={`${job.siteAddress}, ${job.suburb} NSW`} />
              <Row k="Demo job no." v={`#${job.seq} (local sim — not Xero)`} />
              <Row k="Created" v={fmtDate(job.createdAt)} />
            </dl>
            {editSite && client && (
              <div className="space-y-2 border-t border-slate-100 p-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Buyer contact
                  <select className={inputCls} value={job.buyerContactId ?? ''} onChange={(e) => store.run((s) => setJobContacts(s, job.id, { buyerContactId: e.target.value || undefined, siteContactId: job.siteContactId }), 'Buyer contact updated')}>
                    <option value="">— none —</option>
                    {client.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Site manager
                  <select className={inputCls} value={job.siteContactId ?? ''} onChange={(e) => store.run((s) => setJobContacts(s, job.id, { buyerContactId: job.buyerContactId, siteContactId: e.target.value || undefined }), 'Site manager updated')}>
                    <option value="">— none —</option>
                    {client.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                  </select>
                </label>
                <SiteEdit job={job} />
                <p className="text-[11px] text-slate-500">Add or edit contacts on the <Link to={`/clients/${client.id}`} className="font-semibold text-brand-600">client page</Link>.</p>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Operational dates" sub="Stamped as the job moves; booked dates are editable" />
            <dl className="space-y-2 p-5 text-sm">
              <DateRow k="Approved" v={job.dates.approvedAt} />
              <DateRow k="Build booked for" v={job.dates.buildDate} edit={(d) => store.run((s) => setJobDate(s, job.id, 'buildDate', d), 'Build date saved')} />
              <DateRow k="Erected (up in air)" v={job.dates.erectedAt} />
              <DateRow k="Takedown booked for" v={job.dates.takedownDate} edit={(d) => store.run((s) => setJobDate(s, job.id, 'takedownDate', d), 'Takedown date saved')} />
              <DateRow k="Dismantled" v={job.dates.dismantledAt} />
              <DateRow k="Returned & unpacked" v={job.dates.returnedAt} />
              <DateRow k="Invoiced" v={job.dates.invoicedAt} />
              <DateRow k="Paid" v={job.paidAt ? dateOnly(job.paidAt) : undefined} />
            </dl>
            <p className="border-t border-slate-100 px-5 py-2 text-[11px] text-slate-500">No calendar or scheduling service is connected — these are just dates stored in this demo.</p>
          </Card>
          <Card>
            <CardHeader title="Quick actions" />
            <div className="space-y-2 p-4">
              <Button className="w-full" onClick={() => setExpOpen(true)}>
                ＋ Log expense against {job.code}
              </Button>
              {checklist && (
                <Link to={`/packing/${job.id}`} className="flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  🚚 Open packing checklist
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      <DeclineModal jobId={declineOpen ? job.id : null} onClose={() => setDeclineOpen(false)} />
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

function Row({ k, v, link }: { k: string; v: string; link?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{k}</dt>
      <dd className="break-words text-right font-medium text-slate-800">{link ? <Link to={link} className="text-brand-600 hover:underline">{v}</Link> : v}</dd>
    </div>
  )
}

function DateRow({ k, v, edit }: { k: string; v?: string; edit?: (d: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-800">
        {edit ? (
          <input type="date" aria-label={k} value={v ?? ''} onChange={(e) => e.target.value && edit(e.target.value)} className="min-h-[34px] rounded border border-slate-300 px-2 py-1 text-xs" />
        ) : v ? (
          fmtDate(v)
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  )
}

function SiteEdit({ job }: { job: { id: string; siteAddress: string; suburb: string } }) {
  const { run } = useStore()
  const [addr, setAddr] = useState(job.siteAddress)
  const [sub, setSub] = useState(job.suburb)
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-xs font-semibold text-slate-600">Address<input className={inputCls} value={addr} onChange={(e) => setAddr(e.target.value)} onBlur={() => run((s) => updateJobSite(s, job.id, { siteAddress: addr }))} /></label>
      <label className="block text-xs font-semibold text-slate-600">Suburb<input className={inputCls} value={sub} onChange={(e) => setSub(e.target.value)} onBlur={() => run((s) => updateJobSite(s, job.id, { suburb: sub }))} /></label>
    </div>
  )
}
