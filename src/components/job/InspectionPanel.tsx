import { useState } from 'react'
import Notice from '../Notice'
import { Badge, Button, inputCls } from '../ui'
import { addDays } from '../../lib/dates'
import { fmtDate, ymd } from '../../lib/format'
import { inspectionStatus } from '../../lib/inspection'
import { addInspection } from '../../lib/ops'
import type { InspectionRecord, Job } from '../../lib/types'
import { useStore } from '../../store/StoreProvider'

export function InspectionBadge({ job }: { job: Job }) {
  const { state } = useStore()
  const st = inspectionStatus(job, state.settings.inspectionIntervalDays, ymd(new Date()))
  if (st.state === 'not-applicable' || st.state === 'disabled') return null
  const tone = { ok: 'green', 'due-soon': 'amber', overdue: 'red' } as const
  const text = st.state === 'overdue' ? `Inspection overdue ${-st.daysLeft!}d` : st.state === 'due-soon' ? `Inspection due in ${st.daysLeft}d` : `Inspection due ${fmtDate(st.dueDate!)}`
  return <Badge tone={tone[st.state]} title="Configurable demo reminder — not legal guidance">{text}</Badge>
}

/** Demo inspection reminder + local record. Interval is configurable in Kit & Inventory settings. NOT legal or compliance guidance. */
export default function InspectionPanel({ job }: { job: Job }) {
  const { state, run } = useStore()
  const today = ymd(new Date())
  const interval = state.settings.inspectionIntervalDays
  const st = inspectionStatus(job, interval, today)
  const [date, setDate] = useState(today)
  const [by, setBy] = useState('')
  const [outcome, setOutcome] = useState<InspectionRecord['outcome']>('No issues noted')
  const [notes, setNotes] = useState('')
  const msg = {
    'not-applicable': 'Not applicable — the reminder runs only while the scaffold is standing (Erected → Takedown booked).',
    disabled: 'Reminder is switched off (interval is 0). Set an interval in Kit & Inventory → assumptions.',
    ok: 'On track.',
    'due-soon': 'Due soon.',
    overdue: 'Overdue — record an inspection below.',
  }[st.state]
  return (
    <div className="space-y-3">
      <Notice tone="info" title="DEMO REMINDER">
        A configurable {interval}-day reminder counted from erection or the last recorded inspection. It is <b>not legal or compliance guidance</b> and sends nothing — check your real obligations separately.
      </Notice>
      <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200" aria-live="polite">
        <div className="font-semibold text-ink">{msg}</div>
        {st.dueDate && (
          <div className="text-xs text-slate-600">
            Next due {fmtDate(st.dueDate)} (from {st.basis}, {fmtDate(st.basisDate!)}) · {st.daysLeft! < 0 ? `${-st.daysLeft!} day(s) overdue` : `${st.daysLeft} day(s) left`}
          </div>
        )}
      </div>
      {job.inspections.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {[...job.inspections].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <b>{fmtDate(r.date)}</b> · {r.by}
                {r.notes && <span className="block text-xs text-slate-500">{r.notes}</span>}
              </span>
              <Badge tone={r.outcome === 'No issues noted' ? 'green' : 'amber'}>{r.outcome}</Badge>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          run((s, at) => addInspection(s, job.id, { date, by, outcome, notes }, at), `Inspection record saved locally. Next due ${addDays(date, interval)} (demo reminder).`)
          setNotes('')
        }}
      >
        <label className="block text-xs font-semibold text-slate-600">
          Date
          <input type="date" className={inputCls} value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Inspected by
          <input className={inputCls} value={by} onChange={(e) => setBy(e.target.value)} placeholder="Name (fictional)" required />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Outcome
          <select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as InspectionRecord['outcome'])}>
            <option>No issues noted</option>
            <option>Follow-up needed</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Notes
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={!by.trim() || !date}>Record inspection (local record)</Button>
        </div>
      </form>
    </div>
  )
}
