import { Link } from 'react-router-dom'
import InspectionPanel from './InspectionPanel'
import Notice, { StatusPill } from '../Notice'
import SiteRecords from '../SiteRecords'
import { Badge, inputCls } from '../ui'
import { ymd } from '../../lib/format'
import { setSiteDocs } from '../../lib/ops'
import type { Job, NeighbourConsent } from '../../lib/types'
import { useStore } from '../../store/StoreProvider'

/** Pseudo-QR: deterministic grid so the placeholder looks like a QR but is deliberately NOT scannable. */
function MockQr({ seed }: { seed: string }) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const cells: boolean[] = []
  for (let i = 0; i < 169; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    cells.push((h & 3) === 0)
  }
  return (
    <svg viewBox="0 0 13 13" className="h-24 w-24 rounded border border-dashed border-slate-400 bg-white p-1" role="img" aria-label="Mock QR placeholder, not scannable">
      {cells.map((on, i) => on && <rect key={i} x={i % 13} y={Math.floor(i / 13)} width="1" height="1" fill="#94a3b8" />)}
      <text x="6.5" y="7.3" fontSize="2.2" textAnchor="middle" fill="#b91c1c" fontWeight="700">MOCK</text>
    </svg>
  )
}

export default function SiteTab({ job }: { job: Job }) {
  const { run } = useStore()
  const d = job.siteDocs
  const today = ymd(new Date())
  const consentLabel: Record<NeighbourConsent, string> = { 'not-required': 'Not required', 'required-pending': 'Required — pending', received: 'Received' }
  return (
    <div className="space-y-5 p-5">
      <section>
        <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">Site documentation (printable demo forms)</h3>
        <Notice tone="warn" title="DEMO TEMPLATES" className="mb-3">
          Not compliance-approved and not a safety certificate. These are sample layouts for a physical site folder; they do not certify anything. Use your own approved documents for real work.
        </Notice>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['folder', 'Site folder cover sheet', d.folderPrintedAt, 'folderPrintedAt'],
            ['handover', 'Handover / sign-off form', d.handoverPrintedAt, 'handoverPrintedAt'],
            ['neighbour', 'Neighbouring-property consent', undefined, undefined],
          ] as const).map(([kind, label, printed, field]) => (
            <div key={kind} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-semibold text-ink">{label}</div>
              <div className="mt-0.5 min-h-[18px] text-xs text-slate-500">{printed ? `Marked printed ${printed}` : kind === 'neighbour' ? `Status: ${consentLabel[d.neighbourConsent]}` : 'Not printed yet'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link to={`/jobs/${job.id}/docs/${kind}`} className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Open / print
                </Link>
                {field && !printed && (
                  <button className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-brand-600 hover:bg-brand-50" onClick={() => run((s) => setSiteDocs(s, job.id, { [field]: today }), 'Marked as printed (local flag)')}>
                    Mark printed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Neighbouring-property consent (when relevant)
            <select className={inputCls} value={d.neighbourConsent} onChange={(e) => run((s) => setSiteDocs(s, job.id, { neighbourConsent: e.target.value as NeighbourConsent }), 'Consent status updated (local record)')}>
              <option value="not-required">Not required</option>
              <option value="required-pending">Required — pending</option>
              <option value="received">Received</option>
            </select>
          </label>
          <div className="text-xs text-slate-600">
            <div className="mb-1 font-semibold text-slate-600">Handover sign-off</div>
            {d.handoverSignedOff ? (
              <Badge tone="green">Recorded {d.handoverSignedOff.date} · {d.handoverSignedOff.by}</Badge>
            ) : (
              <SignOff jobId={job.id} />
            )}
            <p className="mt-1 text-slate-500">A local note that a paper form was signed — the app holds no signatures and certifies nothing.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">30-day inspection reminder</h3>
        <InspectionPanel job={job} />
      </section>

      <section>
        <h3 className="mb-2 flex flex-wrap items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">
          Site QR access <StatusPill tone="future">Tentative idea · mock only</StatusPill>
        </h3>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-slate-300 p-3">
          <MockQr seed={job.code} />
          <p className="max-w-md text-xs text-slate-600">
            Idea only: a QR on the site folder that opens this job's documents. It was a tentative suggestion and is <b>not built</b> — this picture is a non-scannable placeholder and no link, login or access control exists.
          </p>
        </div>
      </section>

      <SiteRecords job={job} />
    </div>
  )
}

function SignOff({ jobId }: { jobId: string }) {
  const { run } = useStore()
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const by = String(new FormData(e.currentTarget).get('by') ?? '').trim()
        if (by) run((s) => setSiteDocs(s, jobId, { handoverSignedOff: { date: ymd(new Date()), by } }), 'Sign-off noted locally')
      }}
    >
      <input name="by" aria-label="Signed off by" className={inputCls} placeholder="Signed by (name)" required />
      <button className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold hover:bg-slate-50">Note sign-off</button>
    </form>
  )
}
