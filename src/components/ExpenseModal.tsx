import { useEffect, useState } from 'react'
import { ymd } from '../lib/format'
import type { ExpenseValidation } from '../lib/state'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import { Button, Field, inputCls, Modal } from './ui'

export default function ExpenseModal({
  open,
  onClose,
  presetJobId,
}: {
  open: boolean
  onClose: () => void
  presetJobId?: string
}) {
  const { state, addExpense } = useStore()
  const init = () => ({
    jobId: presetJobId ?? '',
    date: ymd(new Date()),
    supplier: '',
    personId: '',
    description: '',
    category: '' as ExpenseCategory | '',
    reason: '',
    amount: '',
  })
  const [f, setF] = useState(init)
  const [errors, setErrors] = useState<ExpenseValidation>({})
  useEffect(() => {
    if (open) {
      setF(init())
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetJobId])
  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const jobs = [...state.jobs].sort((a, b) => b.code.localeCompare(a.code))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const input = {
      jobId: f.jobId,
      date: f.date,
      supplier: f.supplier,
      personId: f.personId,
      description: f.description,
      category: f.category as ExpenseCategory,
      reason: f.reason,
      amount: Number(f.amount),
    }
    const errs = addExpense(input)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log expense" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Job *" error={errors.jobId} hint="Pick from existing job codes — free text isn't allowed.">
          <select
            className={`${inputCls} ${errors.jobId ? 'border-red-400' : ''}`}
            value={f.jobId}
            onChange={(e) => set('jobId', e.target.value)}
            data-testid="expense-job"
          >
            <option value="">Select a job code…</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} — {j.siteAddress}, {j.suburb}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="When *" error={errors.date}>
            <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Where (supplier / location) *" error={errors.supplier}>
            <input className={inputCls} value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="e.g. Metro Scaffold Supplies" />
          </Field>
          <Field label="Who *" error={errors.personId}>
            <select className={inputCls} value={f.personId} onChange={(e) => set('personId', e.target.value)}>
              <option value="">Select a person…</option>
              {state.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category *" error={errors.category}>
            <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select a category…</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="What *" error={errors.description}>
            <input className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Diesel, 60 L" />
          </Field>
          <Field label="Amount (AUD, ex GST) *" error={errors.amount}>
            <input type="number" min="0" step="0.01" className={inputCls} value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <Field label="Why (reason / notes)">
          <textarea className={inputCls} rows={2} value={f.reason} onChange={(e) => set('reason', e.target.value)} />
        </Field>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-500">Amounts in AUD, entered excluding GST.</p>
          <div className="flex gap-2">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save expense
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
