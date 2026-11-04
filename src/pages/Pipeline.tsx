import { useState } from 'react'
import JobCard from '../components/JobCard'
import NewEnquiryModal from '../components/NewEnquiryModal'
import { Button, PageHeader, stageDot } from '../components/ui'
import { money } from '../lib/format'
import { STAGES, type Stage } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Pipeline() {
  const { state, moveJob } = useStore()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const total = state.jobs.reduce((s, j) => s + j.quote, 0)
  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${state.jobs.length} jobs · ${money(total)} total quoted value · drag cards, or use the Back / Forward buttons`}
        actions={
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            ＋ New enquiry
          </Button>
        }
      />
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[1060px] gap-2">
          {STAGES.map((stage) => {
            const jobs = state.jobs.filter((j) => j.stage === stage)
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
                className={`flex min-w-0 flex-1 basis-0 flex-col rounded-xl border bg-slate-200/60 transition-colors ${
                  over ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                }`}
              >
                <header className="min-h-[68px] px-3 pb-2 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${stageDot[stage]}`} />
                      <h2 className="text-[12.5px] font-bold leading-tight text-slate-800">{stage}</h2>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                      {jobs.length}
                    </span>
                  </div>
                  <div className="tabular mt-1 pl-3.5 text-xs font-semibold text-slate-500">{money(value)}</div>
                </header>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-3">
                  {jobs.map((j) => (
                    <JobCard key={j.id} job={j} dragging={dragId === j.id} onDragStart={() => setDragId(j.id)} onDragEnd={() => { setDragId(null); setOverStage(null) }} />
                  ))}
                  {jobs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">No jobs</div>
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
