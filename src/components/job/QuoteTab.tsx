import { Link, useNavigate } from 'react-router-dom'
import QuoteBadge from '../QuoteBadge'
import { Button, EmptyState } from '../ui'
import { money, pct } from '../../lib/format'
import { computeQuote } from '../../lib/quote'
import { createQuote, jobQuotes } from '../../lib/state'
import type { Job } from '../../lib/types'
import { useStore } from '../../store/StoreProvider'

export default function QuoteTab({ job }: { job: Job }) {
  const { state, run } = useStore()
  const nav = useNavigate()
  const quotes = jobQuotes(state, job.id)
  const active = quotes.find((q) => q.id === job.activeQuoteId)
  const canCreate = !active || active.status === 'superseded'
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <p className="text-xs text-slate-500">Quotes are built from this job's kit list. Issue / approve / decline are simulated and move the job through its lifecycle.</p>
        {active ? (
          <Link to={`/quotes/${active.id}`} className="inline-flex min-h-[36px] items-center rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white hover:bg-brand-700">Open active quote</Link>
        ) : null}
        {canCreate && (
          <Button
            variant="primary"
            disabled={job.stage === 'Declined'}
            title={job.stage === 'Declined' ? 'Re-open the job first' : ''}
            onClick={() => {
              const r = createQuote(state, job.id, new Date().toISOString())
              if (!r) return
              run(() => r.state, `Quote ${r.quote.number} drafted from the kit list`)
              nav(`/quotes/${r.quote.id}`)
            }}
          >
            ＋ Build quote from kit
          </Button>
        )}
      </div>
      {quotes.length === 0 ? (
        <EmptyState title="No quote yet">Add kit to the job, then build a quote with hire period, labour, transport and margin.</EmptyState>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-2">Version</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Sell</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {quotes.map((q) => {
              const t = computeQuote(q)
              return (
                <tr key={q.id}>
                  <td className="px-5 py-2 font-mono text-xs font-bold">{q.number}</td>
                  <td className="px-3 py-2"><QuoteBadge status={q.status} /></td>
                  <td className="tabular px-3 py-2 text-right font-semibold">{money(t.sell)}</td>
                  <td className="tabular px-3 py-2 text-right text-slate-600">{t.marginDefined ? pct(t.marginPct, 1) : 'n/a'}</td>
                  <td className="px-5 py-2 text-right"><Link to={`/quotes/${q.id}`} className="font-semibold text-brand-600">Open</Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
