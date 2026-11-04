import { useNavigate } from 'react-router-dom'
import { money } from '../lib/format'
import { isCosted, jobFinancials, stageIndex } from '../lib/state'
import { STAGES, type Job } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import { Badge, MarginBadge } from './ui'

export default function JobCard({
  job,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  job: Job
  onDragStart: () => void
  onDragEnd: () => void
  dragging: boolean
}) {
  const { state, stepJob } = useStore()
  const nav = useNavigate()
  const f = jobFinancials(state, job)
  const idx = stageIndex(job.stage)
  const hasChecklist = !!state.checklists[job.id]
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', job.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={() => nav(`/jobs/${job.id}`)}
      data-testid={`card-${job.code}`}
      className={`group cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-amber-400 hover:shadow-md ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold text-slate-500">{job.code}</span>
        {hasChecklist && (
          <span title="Packing checklist generated" className="text-[11px] text-slate-400">
            🚚
          </span>
        )}
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-slate-900">{job.client}</div>
      <div className="text-xs text-slate-500">{job.suburb}</div>
      <div className="tabular mt-2 text-sm font-bold text-slate-800">{money(job.quote)}</div>
      <div className="mt-1">{isCosted(job.stage) ? <MarginBadge f={f} /> : <Badge>Not costed</Badge>}</div>
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
        <button
          disabled={idx === 0}
          onClick={() => stepJob(job.id, -1)}
          aria-label={`Move ${job.code} back to ${STAGES[idx - 1] ?? ''}`}
          title={idx > 0 ? `Back to ${STAGES[idx - 1]}` : ''}
          className="rounded px-2.5 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:invisible"
        >
          ◀
        </button>
        <button
          disabled={idx === STAGES.length - 1}
          onClick={() => stepJob(job.id, 1)}
          aria-label={`Move ${job.code} forward to ${STAGES[idx + 1] ?? ''}`}
          title={idx < STAGES.length - 1 ? `Forward to ${STAGES[idx + 1]}` : ''}
          className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-amber-100 hover:text-amber-800 disabled:invisible"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
