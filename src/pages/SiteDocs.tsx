import { Link, Navigate, useParams } from 'react-router-dom'
import { SchematicPlaceholder } from '../components/SiteRecords'
import Notice from '../components/Notice'
import { Button } from '../components/ui'
import { contactOf, findClient } from '../lib/clients'
import { fmtDate } from '../lib/format'
import { findJob } from '../lib/state'
import { useStore } from '../store/StoreProvider'

const TITLES = { folder: 'Site folder cover sheet', handover: 'Scaffold handover / sign-off', neighbour: 'Neighbouring-property consent' } as const
type Kind = keyof typeof TITLES

const Line = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex gap-2 border-b border-slate-300 py-1.5 text-sm">
    <span className="w-44 shrink-0 text-slate-500">{label}</span>
    <span className="font-medium">{value || ' '}</span>
  </div>
)
const Sign = ({ label }: { label: string }) => (
  <div className="mt-6 grid gap-6 sm:grid-cols-2">
    <div><div className="h-10 border-b border-slate-700" /><div className="mt-1 text-xs text-slate-500">{label} — signature</div></div>
    <div><div className="h-10 border-b border-slate-700" /><div className="mt-1 text-xs text-slate-500">Name &amp; date</div></div>
  </div>
)

/** Printable DEMO site forms. Prefilled from the job; blank signature lines for use on paper. Not compliance-approved. */
export default function SiteDocs() {
  const { jobId, kind } = useParams()
  const { state } = useStore()
  const job = findJob(state, jobId)
  if (!job || !(kind && kind in TITLES)) return <Navigate to="/jobs" replace />
  const k = kind as Kind
  const client = findClient(state, job.clientId)
  const buyer = contactOf(client, job.buyerContactId)
  const site = contactOf(client, job.siteContactId)
  const quote = state.quotes.find((q) => q.id === job.activeQuoteId)

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/jobs/${job.id}?tab=site`} className="text-sm font-semibold text-brand-600">← Back to job</Link>
        <Button variant="primary" onClick={() => window.print()}>🖨 Print</Button>
      </div>
      <Notice tone="warn" title="DEMO TEMPLATE" className="mb-4">
        Not compliance-approved, not a safety certificate, not legal advice. For demonstrating a paper site-folder workflow only.
      </Notice>
      <article className="doc-sheet mx-auto max-w-[800px] rounded-lg border border-slate-300 bg-white p-6 sm:p-10">
        <header className="mb-4 border-b-2 border-brand-600 pb-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">DEMO TEMPLATE — NOT COMPLIANCE-APPROVED — NOT A SAFETY CERTIFICATE</div>
          <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.08em] text-brand-600">{TITLES[k]}</h1>
          <div className="text-xs text-slate-500">Lion &amp; Co Scaffolding · demo job {job.code} · fictional data</div>
        </header>
        <Line label="Client" value={job.client} />
        <Line label="Site address" value={`${job.siteAddress}, ${job.suburb} NSW`} />
        <Line label="Buyer contact" value={buyer ? `${buyer.name} ${buyer.phone}` : ''} />
        <Line label="Site manager" value={site ? `${site.name} ${site.phone}` : ''} />
        <Line label="Quote ref (demo)" value={quote?.number} />
        <Line label="Erected" value={job.dates.erectedAt ? fmtDate(job.dates.erectedAt) : ''} />
        <Line label="Planned takedown" value={job.dates.takedownDate ? fmtDate(job.dates.takedownDate) : ''} />

        {k === 'folder' && (
          <>
            <h2 className="mt-5 text-sm font-bold uppercase tracking-wide">Contents checklist (tick on paper)</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {['Approved quote / scope', 'Site notes & access arrangements', 'Schematics / sketches (attach printed copies)', 'Neighbouring-property consent (if relevant)', 'Handover / sign-off form', 'Inspection record sheet', 'Emergency contacts'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="print-box" />{t}</li>
              ))}
            </ul>
            {job.siteNotes.trim() && <><h2 className="mt-5 text-sm font-bold uppercase tracking-wide">Site notes</h2><p className="whitespace-pre-wrap text-sm">{job.siteNotes}</p></>}
            <h2 className="mt-5 text-sm font-bold uppercase tracking-wide">Schematic (placeholder)</h2>
            <SchematicPlaceholder className="mt-2 max-w-sm" />
            {job.attachments.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">{job.attachments.map((a) => <li key={a.id}>{a.kind}: {a.label}</li>)}</ul>
            )}
          </>
        )}

        {k === 'handover' && (
          <>
            <h2 className="mt-5 text-sm font-bold uppercase tracking-wide">Handover items (tick on paper — sample wording)</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {['Scaffold area walked through with the site contact', 'Access points and loading limits explained', 'Site contact informed not to alter the scaffold', 'Inspection interval discussed (demo: every ' + state.settings.inspectionIntervalDays + ' days)', 'Contact number for issues provided'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="print-box" />{t}</li>
              ))}
            </ul>
            <Sign label="Lion & Co representative" />
            <Sign label="Client / site manager" />
          </>
        )}

        {k === 'neighbour' && (
          <>
            <Line label="Neighbouring address" value="" />
            <Line label="Neighbour name" value="" />
            <p className="mt-4 text-sm leading-relaxed">
              Sample wording only: I, the owner/occupier of the neighbouring property named above, have been informed that scaffolding is proposed to be erected on or near my boundary at the site address between the dates shown, and I consent / do not consent (circle one) to access as described.
            </p>
            <Line label="Access / conditions" value="" />
            <Sign label="Neighbour" />
            <p className="mt-4 text-xs text-slate-500">Consent status on this job (local record): {job.siteDocs.neighbourConsent}. Whether consent is needed, and what it must say, depends on your real circumstances — this template does not decide that.</p>
          </>
        )}
      </article>
    </div>
  )
}
