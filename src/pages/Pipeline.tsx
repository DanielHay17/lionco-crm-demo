import { useState } from 'react'
import JobCard from '../components/JobCard'
import NewEnquiryModal from '../components/NewEnquiryModal'
import { Button, PageHeader, stageColor } from '../components/ui'
import { money } from '../lib/format'
import { SERVICE_TYPES, STAGES, type Stage } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Pipeline() {
  const { state, moveJob } = useStore()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [service, setService] = useState<string>('')

  const visible = state.jobs.filter((j) => !service || j.serviceType === service || (service === 'Drone Services' && j.droneSurvey))
  const total = visible.reduce((s, j) => s + j.quote, 0)
  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${visible.length} jobs · ${money(total)} total quoted value · drag cards, or use the Back / Forward buttons`}
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
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[1060px] gap-2">
          {STAGES.map((stage) => {
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
                  if (id) moveJob(id, stage)
                }}
                style={{ borderTopColor: stageColor[stage] }}
                className={`flex min-w-0 flex-1 basis-0 flex-col rounded-xl border border-t-[3px] transition-colors duration-150 ${
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
      <NewEnquiryModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
