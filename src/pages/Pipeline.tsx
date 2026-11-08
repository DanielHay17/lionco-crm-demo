import { useState } from 'react'
import JobCard from '../components/JobCard'
import NewEnquiryModal from '../components/NewEnquiryModal'
import { Button, PageHeader, stageColor } from '../components/ui'
import DeclineModal from '../components/DeclineModal'
import { money } from '../lib/format'
import { PHASES, STAGE_HINT, type PhaseId } from '../lib/stages'
import { SERVICE_TYPES, type Stage } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Pipeline() {
  const { state, moveJob } = useStore()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [service, setService] = useState<string>('')
  const [phase, setPhase] = useState<PhaseId | ''>('')
  const [declineId, setDeclineId] = useState<string | null>(null)

  const visible = state.jobs.filter((j) => !service || j.serviceType === service || (service === 'Drone Services' && j.droneSurvey))
  const total = visible.reduce((s, j) => s + j.quote, 0)
  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${visible.length} jobs · ${money(total)} total value · drag cards, or use the ◀ ▶ buttons. Scroll sideways for later stages.`}
        actions={
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            ＋ New enquiry
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by service type">
        <span className="mr-1 font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Service</span>
        {['', ...SERVICE_TYPES].map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setService(t)}
            aria-pressed={service === t}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
              service === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {t || 'All'}
            {t === 'Drone Services' && <span className="ml-1 opacity-70">(incl. add-on)</span>}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by phase">
        <span className="mr-1 font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Phase</span>
        {([['', 'All stages'], ...PHASES.map((p) => [p.id, p.label])] as [PhaseId | '', string][]).map(([id, label]) => (
          <button
            key={id || 'all'}
            onClick={() => setPhase(id)}
            aria-pressed={phase === id}
            className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
              phase === id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scroll-thin overflow-x-auto pb-4">
        <div className="flex w-max gap-3">
          {PHASES.filter((p) => !phase || p.id === phase).map((ph) => (
            <div key={ph.id} className="flex flex-col">
              <div className="mb-1.5 px-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{ph.label}</div>
              <div className="flex gap-2">
          {ph.stages.map((stage) => {
            const jobs = visible.filter((j) => j.stage === stage)
            const value = jobs.reduce((s, j) => s + j.quote, 0)
            const over = overStage === stage && dragId !== null
            return (
              <section
                key={stage}
                data-testid={`col-${stage}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overStage !== stage) setOverStage(stage)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage((s) => (s === stage ? null : s))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain') || dragId
                  setOverStage(null)
                  setDragId(null)
                  if (id) {
                    if (stage === 'Declined') setDeclineId(id)
                    else moveJob(id, stage)
                  }
                }}
                style={{ borderTopColor: stageColor[stage] }}
                title={STAGE_HINT[stage]}
                className={`flex w-[188px] shrink-0 flex-col rounded-xl border border-t-[3px] transition-colors duration-150 ${
                  over ? 'border-brand-300 bg-brand-50 shadow-[inset_0_0_0_2px_rgba(23,37,102,0.15)]' : 'border-slate-200 bg-slate-200/50'
                }`}
              >
                <header className="min-h-[68px] px-3 pb-2 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-[13px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">{stage}</h2>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-300">
                      {jobs.length}
                    </span>
                  </div>
                  <div className="tabular mt-1 text-[13px] font-bold text-slate-600">{money(value)}</div>
                </header>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-3">
                  {jobs.map((j) => (
                    <JobCard key={j.id} job={j} dragging={dragId === j.id} onDragStart={() => setDragId(j.id)} onDragEnd={() => { setDragId(null); setOverStage(null) }} />
                  ))}
                  {jobs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">{over ? 'Drop to move here' : 'No jobs'}</div>
                  )}
                </div>
              </section>
            )
          })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DeclineModal jobId={declineId} onClose={() => setDeclineId(null)} />
      <NewEnquiryModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
