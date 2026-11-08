import { Link } from 'react-router-dom'
import { findClient } from '../lib/clients'
import { findQuote } from '../lib/state'
import type { Job } from '../lib/types'
import { useStore } from '../store/StoreProvider'

/** Client › Job › Kit › Quote breadcrumbs — links the connected objects. */
export default function Crumbs({ job, current }: { job: Job; current?: string }) {
  const { state } = useStore()
  const client = findClient(state, job.clientId)
  const quote = findQuote(state, job.activeQuoteId)
  const parts: { label: string; to?: string }[] = [
    { label: client?.name ?? job.client, to: client ? `/clients/${client.id}` : undefined },
    { label: job.code, to: `/jobs/${job.id}` },
    { label: `Kit (${job.kit.length})`, to: `/jobs/${job.id}?tab=kit` },
    ...(quote ? [{ label: `Quote ${quote.number}`, to: `/quotes/${quote.id}` }] : []),
    ...(state.checklists[job.id] ? [{ label: 'Packing', to: `/packing/${job.id}` }] : []),
  ]
  return (
    <nav aria-label="Breadcrumb" className="no-print mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500">
      {parts.map((p, i) => (
        <span key={p.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>›</span>}
          {p.to ? (
            <Link to={p.to} className={`inline-flex min-h-[32px] items-center hover:text-brand-600 ${current === p.label ? 'font-semibold text-ink' : ''}`}>
              {p.label}
            </Link>
          ) : (
            <span>{p.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
