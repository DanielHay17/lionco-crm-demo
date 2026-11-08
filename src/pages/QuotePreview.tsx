import { Link, Navigate, useParams } from 'react-router-dom'
import { SchematicPlaceholder } from '../components/SiteRecords'
import Notice from '../components/Notice'
import { Button } from '../components/ui'
import { contactOf, findClient } from '../lib/clients'
import { fmtDate, money2 } from '../lib/format'
import { computeQuote, lineSell, lineWeeks } from '../lib/quote'
import { findJob, findQuote } from '../lib/state'
import { useStore } from '../store/StoreProvider'

/** Customer-facing printable quote. Deliberately shows ONLY sell prices — never costs, profit or margin. */
export default function QuotePreview() {
  const { quoteId } = useParams()
  const { state } = useStore()
  const quote = findQuote(state, quoteId)
  const job = findJob(state, quote?.jobId)
  if (!quote || !job) return <Navigate to="/quotes" replace />
  const client = findClient(state, job.clientId)
  const buyer = contactOf(client, job.buyerContactId)
  const site = contactOf(client, job.siteContactId)
  const t = computeQuote(quote)
  const date = quote.issuedAt ?? quote.createdAt
  const listed = job.attachments.filter((a) => a.includeOnQuote)
  const base = import.meta.env.BASE_URL

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <Link to={`/quotes/${quote.id}`} className="font-semibold text-brand-600">← Back to quote builder</Link>
        </div>
        <Button variant="primary" onClick={() => window.print()}>
          🖨 Print / save as PDF
        </Button>
      </div>
      <Notice tone="mock" title="CUSTOMER PREVIEW" className="mb-4">
        This is what a customer-facing quote would look like. Internal costs, profit and margin are not shown. It is a <b>demo document — nothing has been emailed</b>, and it has no contractual standing.
      </Notice>

      <article className="doc-sheet mx-auto max-w-[800px] rounded-lg border border-slate-300 bg-white p-6 shadow-sm sm:p-10" aria-label="Customer quote preview">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand-600 pb-4">
          <img src={`${base}brand/lionco-logo-dark.png`} alt="Lion & Co Scaffolding" className="h-12 w-auto" />
          <div className="text-right">
            <div className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-brand-600">Quote</div>
            <div className="font-mono text-sm font-bold">{quote.number}</div>
            <div className="text-xs text-slate-500">{fmtDate(date)} · DEMO — not a tax invoice</div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <h2 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Prepared for</h2>
            <div className="font-semibold">{job.client}</div>
            {buyer && (
              <div className="text-slate-600">
                {buyer.name}
                {buyer.email && <div>{buyer.email}</div>}
                {buyer.phone && <div>{buyer.phone}</div>}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Site</h2>
            <div className="font-semibold">{job.siteAddress}</div>
            <div className="text-slate-600">{job.suburb} NSW</div>
            {site && <div className="text-slate-600">Site contact: {site.name}{site.phone ? ` · ${site.phone}` : ''}</div>}
            <div className="text-slate-600">{job.serviceType}{job.droneSurvey ? ' + drone site survey' : ''}</div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Scope & pricing (ex GST)</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-[11px] uppercase text-slate-500">
                  <th className="py-1.5 pr-2">Item</th>
                  <th className="px-2 text-right">Qty</th>
                  <th className="px-2 text-right">Rate</th>
                  <th className="pl-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 align-top">
                    <td className="py-1.5 pr-2">
                      {l.description}
                      {l.kind === 'kit' && <span className="block text-[11px] text-slate-500">hire × {lineWeeks(l, quote.hireWeeks)} week{lineWeeks(l, quote.hireWeeks) === 1 ? '' : 's'}</span>}
                    </td>
                    <td className="tabular px-2 text-right">{l.qty}</td>
                    <td className="tabular px-2 text-right">{money2(l.unitPrice)}{l.kind === 'kit' ? '/wk' : l.kind === 'labour' ? '/h' : ''}</td>
                    <td className="tabular pl-2 text-right font-medium">{money2(lineSell(l, quote.hireWeeks))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-semibold">Total (ex GST)</td>
                  <td className="tabular pt-3 text-right text-lg font-bold">{money2(t.sell)}</td>
                </tr>
                {quote.depositEnabled && t.deposit > 0 && (
                  <>
                    <tr>
                      <td colSpan={3} className="text-right text-slate-600">Deposit on acceptance ({quote.depositPct}%)</td>
                      <td className="tabular text-right">{money2(t.deposit)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right text-slate-600">Balance</td>
                      <td className="tabular text-right">{money2(t.balanceAfterDeposit)}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </section>

        {job.siteNotes.trim() && (
          <section className="mt-6">
            <h2 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Site notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{job.siteNotes}</p>
          </section>
        )}

        <section className="mt-6 break-inside-avoid">
          <h2 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Schematic / attachments</h2>
          {listed.length > 0 ? (
            <ul className="mb-2 list-disc pl-5 text-sm text-slate-700">
              {listed.map((a) => (
                <li key={a.id}>{a.kind}: {a.label} <span className="text-xs text-slate-500">(placeholder — no file attached in this demo)</span></li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-slate-500">No attachments listed.</p>
          )}
          <SchematicPlaceholder className="max-w-sm" />
        </section>

        <section className="mt-6 text-xs leading-relaxed text-slate-500">
          <h2 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Terms</h2>
          {quote.terms}
        </section>
        <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">Lion & Co Scaffolding · Safe. Reliable. Scaffolding done right. · FICTIONAL DEMO DATA</footer>
      </article>
    </div>
  )
}
