import { useNavigate } from 'react-router-dom'
import { money } from '../lib/format'
import { isCosted, jobFinancials, stageIndex } from '../lib/state'
import { STAGES, type Job } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import { MarginBadge, ServiceBadge, stageColor } from './ui'

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
        // defer so the browser captures the drag image before we restyle the card
        setTimeout(onDragStart, 0)
      }}
      onDragEnd={onDragEnd}
      onClick={() => nav(`/jobs/${job.id}`)}
      data-testid={`card-${job.code}`}
      style={{ borderLeftColor: stageColor[job.stage] }}
      className={`group cursor-grab rounded-lg border border-l-[3px] border-slate-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(16,18,21,0.06)] transition-all duration-150 hover:-translate-y-px hover:shadow-md active:cursor-grabbing ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] font-bold tracking-tight text-slate-500">{job.code}</span>
        {hasChecklist && (
          <span title="Packing checklist generated" className="text-[11px] text-slate-400">
            🚚
          </span>
        )}
      </div>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-ink">{job.client}</div>
      <div className="text-xs text-slate-500">{job.suburb}</div>
      <div className="mt-1">
        <ServiceBadge service={job.serviceType} drone={job.droneSurvey} />
      </div>
      <div className="tabular mt-1.5 text-[15px] font-bold text-ink">{money(job.quote)}</div>
      <div className="mt-1">{isCosted(job.stage) ? <MarginBadge f={f} /> : <span className="text-[11px] text-slate-400">Not costed yet</span>}</div>
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          disabled={idx === 0}
          onClick={() => stepJob(job.id, -1)}
          aria-label={`Move ${job.code} back to ${STAGES[idx - 1] ?? ''}`}
          title={idx > 0 ? `Back to ${STAGES[idx - 1]}` : ''}
          className="rounded px-2.5 py-0.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink disabled:invisible"
        >
          ◀
        </button>
        <button
          disabled={idx === STAGES.length - 1}
          onClick={() => stepJob(job.id, 1)}
          aria-label={`Move ${job.code} forward to ${STAGES[idx + 1] ?? ''}`}
          title={idx < STAGES.length - 1 ? `Forward to ${STAGES[idx + 1]}` : ''}
          className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-brand-600 hover:text-white disabled:invisible"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
