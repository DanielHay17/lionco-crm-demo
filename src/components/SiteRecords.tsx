import { useEffect, useState } from 'react'
import { addAttachment, removeAttachment, updateAttachment, updateJobSite } from '../lib/ops'
import type { Job, SiteAttachment } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import Notice from './Notice'
import { Button, Card, CardHeader, inputCls } from './ui'

/** Editable site notes + attachment PLACEHOLDERS (names only — file contents are never read or stored). */
export default function SiteRecords({ job }: { job: Job }) {
  const { run } = useStore()
  const [notes, setNotes] = useState(job.siteNotes)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<SiteAttachment['kind']>('Schematic')
  const [fileName, setFileName] = useState<string | undefined>()
  useEffect(() => setNotes(job.siteNotes), [job.id, job.siteNotes])

  return (
    <Card>
      <CardHeader title="Site notes & schematics" sub="Notes appear on the customer quote preview and the site folder" />
      <div className="space-y-4 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Site notes (editable)</span>
          <textarea
            className={inputCls}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== job.siteNotes && run((s) => updateJobSite(s, job.id, { siteNotes: notes }), 'Site notes saved')}
            placeholder="Access, hazards, neighbours, working hours…"
          />
        </label>
        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-600">Attachments (placeholders)</div>
          <Notice tone="info" className="mb-2">
            Nothing is uploaded. Choosing a file records <b>only its name</b> — the contents are never read, stored or sent. Don't attach sensitive drawings to this demo.
          </Notice>
          {job.attachments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-500">No attachment placeholders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {job.attachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{a.kind}</span>
                  <span className="min-w-0 flex-1 font-medium text-slate-800">
                    {a.label}
                    {a.fileName && <span className="ml-1 text-xs font-normal text-slate-500">({a.fileName} — name only)</span>}
                  </span>
                  <label className="flex min-h-[32px] items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={a.includeOnQuote} onChange={(e) => run((s) => updateAttachment(s, job.id, a.id, { includeOnQuote: e.target.checked }))} />
                    List on quote
                  </label>
                  <button onClick={() => run((s) => removeAttachment(s, job.id, a.id))} aria-label={`Remove ${a.label}`} className="min-h-[32px] rounded px-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!label.trim()) return
              run((s, at) => addAttachment(s, job.id, { kind, label, note: '', fileName, includeOnQuote: false }, at), 'Attachment placeholder added')
              setLabel('')
              setFileName(undefined)
            }}
          >
            <select className={`${inputCls} !w-36`} value={kind} onChange={(e) => setKind(e.target.value as SiteAttachment['kind'])} aria-label="Attachment type">
              {['Schematic', 'Site sketch', 'Photo', 'Other'].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input className={`${inputCls} !w-56 flex-1`} placeholder="Label, e.g. East elevation sketch" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Attachment label" />
            <label className="inline-flex min-h-[38px] cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {fileName ? `📎 ${fileName}` : '📎 Pick file (name only)'}
              <input type="file" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name)} />
            </label>
            <Button type="submit" variant="primary" disabled={!label.trim()}>
              Add placeholder
            </Button>
          </form>
        </div>
      </div>
    </Card>
  )
}

/** Illustrative scaffold elevation — a generic placeholder drawing, NOT an engineered or job-specific schematic. */
export function SchematicPlaceholder({ className = '' }: { className?: string }) {
  return (
    <figure className={className}>
      <svg viewBox="0 0 320 150" role="img" aria-label="Illustrative scaffold elevation placeholder" className="w-full rounded border border-slate-300 bg-white">
        <rect x="8" y="128" width="304" height="6" fill="#cbd5e1" />
        {[0, 1, 2, 3].map((i) => (
          <line key={`v${i}`} x1={40 + i * 80} y1="128" x2={40 + i * 80} y2="14" stroke="#172566" strokeWidth="3" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={`h${i}`}>
            <line x1="40" y1={118 - i * 34} x2="280" y2={118 - i * 34} stroke="#172566" strokeWidth="3" />
            {i < 3 && <line x1="40" y1={118 - i * 34} x2="120" y2={84 - i * 34} stroke="#64748b" strokeWidth="1.5" />}
          </g>
        ))}
        <rect x="40" y="16" width="240" height="4" fill="#94a3b8" />
      </svg>
      <figcaption className="mt-1 text-[11px] italic text-slate-500">Illustrative placeholder only — not to scale, not an engineered drawing, not specific to this site.</figcaption>
    </figure>
  )
}
