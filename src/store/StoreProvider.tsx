import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { clearState, loadState, saveState } from '../lib/storage'
import { buildSeed } from '../lib/seed'
import * as S from '../lib/state'
import { STAGES, type AppState, type Job, type KitItem, type Stage, type Zone } from '../lib/types'

interface ToastMsg {
  id: number
  text: string
  tone: 'info' | 'success' | 'warn'
  action?: { label: string; to: string }
}

interface Store {
  state: AppState
  toast: (text: string, opts?: { tone?: ToastMsg['tone']; action?: ToastMsg['action'] }) => void
  moveJob: (jobId: string, stage: Stage) => void
  stepJob: (jobId: string, dir: 1 | -1) => void
  createJob: (input: S.NewJobInput) => Job
  setQuote: (jobId: string, quote: number) => void
  setKitQty: (jobId: string, itemId: string, qty: number) => void
  addNote: (jobId: string, text: string) => void
  addExpense: (input: S.ExpenseInput) => S.ExpenseValidation
  deleteExpense: (id: string) => void
  toggleLine: (jobId: string, lineId: string) => void
  setLineZone: (jobId: string, lineId: string, zone: Zone) => void
  regenerateChecklist: (jobId: string) => void
  addCatalogueItem: (item: Omit<KitItem, 'id'>) => void
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside StoreProvider')
  return v
}

const initial = (): AppState => {
  const loaded = loadState()
  if (loaded) return loaded
  const seed = buildSeed(new Date())
  saveState(seed)
  return seed
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initial)
  const ref = useRef(state)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const toastId = useRef(0)

  const toast = useCallback<Store['toast']>((text, opts) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, text, tone: opts?.tone ?? 'info', action: opts?.action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const apply = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(ref.current)
    if (next === ref.current) return ref.current
    ref.current = next
    setState(next)
    saveState(next)
    return next
  }, [])

  const store = useMemo<Store>(() => {
    const nowIso = () => new Date().toISOString()
    const move = (jobId: string, stage: Stage) => {
      const before = ref.current
      const job = S.findJob(before, jobId)
      if (!job || job.stage === stage) return
      const next = apply((s) => S.moveJob(s, jobId, stage, nowIso()))
      const generated = !before.checklists[jobId] && !!next.checklists[jobId]
      if (generated) {
        toast(`${job.code} approved. Packing checklist generated —`, {
          tone: 'success',
          action: { label: 'view', to: `/packing/${jobId}` },
        })
      } else if (stage === 'Approved' && !next.checklists[jobId]) {
        toast(`${job.code} approved, but the kit list is empty — add kit items to generate a packing checklist`, {
          tone: 'warn',
          action: { label: 'Edit kit list', to: `/jobs/${jobId}` },
        })
      } else {
        toast(`${job.code} moved to ${stage}`)
      }
    }
    return {
      state,
      toast,
      moveJob: move,
      stepJob: (jobId, dir) => {
        const job = S.findJob(ref.current, jobId)
        if (!job) return
        const idx = S.stageIndex(job.stage) + dir
        const target = STAGES[idx]
        if (target) move(jobId, target)
      },
      createJob: (input) => {
        const now = new Date()
        let created!: Job
        apply((s) => {
          const r = S.addJob(s, input, now)
          created = r.job
          return r.state
        })
        toast(`Enquiry ${created.code} created`, { tone: 'success', action: { label: 'Open job', to: `/jobs/${created.id}` } })
        return created
      },
      setQuote: (jobId, quote) => apply((s) => S.setQuote(s, jobId, quote, nowIso())),
      setKitQty: (jobId, itemId, qty) => apply((s) => S.setKitQty(s, jobId, itemId, qty)),
      addNote: (jobId, text) => apply((s) => S.addNote(s, jobId, text, nowIso())),
      addExpense: (input) => {
        const errors = S.validateExpense(ref.current, input)
        if (Object.keys(errors).length) return errors
        apply((s) => S.addExpense(s, input, nowIso()))
        const job = S.findJob(ref.current, input.jobId)
        toast(`Expense logged against ${job?.code ?? 'job'} — profit updated`, { tone: 'success' })
        return {}
      },
      deleteExpense: (id) => {
        apply((s) => S.deleteExpense(s, id))
        toast('Expense deleted')
      },
      toggleLine: (jobId, lineId) => apply((s) => S.toggleLine(s, jobId, lineId)),
      setLineZone: (jobId, lineId, zone) => apply((s) => S.setLineZone(s, jobId, lineId, zone)),
      regenerateChecklist: (jobId) => {
        apply((s) => S.regenerateChecklist(s, jobId, nowIso()))
        toast('Checklist regenerated from the kit list', { tone: 'success' })
      },
      addCatalogueItem: (item) => {
        apply((s) => S.addCatalogueItem(s, item))
        toast(`Added ${item.name} to the catalogue`, { tone: 'success' })
      },
      resetDemo: () => {
        clearState()
        const seed = buildSeed(new Date())
        ref.current = seed
        setState(seed)
        saveState(seed)
        toast('Demo data reset to the original examples', { tone: 'success' })
      },
    }
  }, [state, apply, toast])

  return (
    <Ctx.Provider value={store}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[60] flex w-96 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-enter pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.tone === 'success'
                ? 'border-emerald-200 bg-white text-slate-800'
                : t.tone === 'warn'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  t.tone === 'success' ? 'bg-emerald-500' : t.tone === 'warn' ? 'bg-amber-500' : 'bg-slate-400'
                }`}
              />
              <div className="flex-1">
                {t.text}
                {t.action && (
                  <Link to={t.action.to} className="ml-2 font-semibold text-brand-600 underline underline-offset-2">
                    {t.action.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
