import { useEffect, useRef, useState } from 'react'
import { ymd } from '../lib/format'
import type { ExpenseValidation } from '../lib/state'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import JobPicker from './JobPicker'
import { Button, Field, inputCls } from './ui'

const blank = (jobId = '') => ({
  jobId,
  date: ymd(new Date()),
  supplier: '',
  personId: '',
  description: '',
  category: '' as ExpenseCategory | '',
  reason: '',
  amount: '',
})

/**
 * Expense entry form. Job is chosen from existing job codes only.
 * `inline` keeps job/who/date/category after saving so several receipts can be entered quickly.
 */
export default function ExpenseForm({
  presetJobId,
  inline = false,
  onSaved,
  onCancel,
}: {
  presetJobId?: string
  inline?: boolean
  onSaved?: () => void
  onCancel?: () => void
}) {
  const { state, addExpense } = useStore()
  const [f, setF] = useState(() => blank(presetJobId))
  const [errors, setErrors] = useState<ExpenseValidation>({})
  const whatRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (presetJobId) setF((p) => ({ ...p, jobId: presetJobId }))
  }, [presetJobId])

  const jobs = [...state.jobs].sort((a, b) => b.code.localeCompare(a.code))
  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = addExpense({
      jobId: f.jobId,
      date: f.date,
      supplier: f.supplier,
      personId: f.personId,
      description: f.description,
      category: f.category as ExpenseCategory,
      reason: f.reason,
      amount: Number(f.amount),
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (inline) {
      setF((p) => ({ ...blank(p.jobId), personId: p.personId, date: p.date, category: p.category }))
      whatRef.current?.focus()
    }
    onSaved?.()
  }

  const jobField = (
    <Field label="Job code *" error={errors.jobId} hint={inline ? undefined : 'Pick from existing job codes — free text isn’t allowed.'}>
      <JobPicker jobs={jobs} value={f.jobId} onChange={(id) => set('jobId', id)} error={errors.jobId} />
    </Field>
  )
  const who = (
    <Field label="Who *" error={errors.personId}>
      <select className={inputCls} value={f.personId} onChange={(e) => set('personId', e.target.value)} aria-label="Who">
        <option value="">Select…</option>
        {state.people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.role}
          </option>
        ))}
      </select>
    </Field>
  )
  const category = (
    <Field label="Category *" error={errors.category}>
      <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)} aria-label="Category">
        <option value="">Select…</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </Field>
  )
  const what = (
    <Field label="What *" error={errors.description}>
      <input ref={whatRef} className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Diesel, 60 L" aria-label="What" />
    </Field>
  )
  const where = (
    <Field label="Where (supplier / location) *" error={errors.supplier}>
      <input className={inputCls} value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="e.g. Metro Scaffold Supplies" aria-label="Where" />
    </Field>
  )
  const amount = (
    <Field label="Amount (AUD, ex GST) *" error={errors.amount}>
      <input type="number" min="0" step="0.01" className={`${inputCls} tabular`} value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" aria-label="Amount" />
    </Field>
  )
  const date = (
    <Field label="When *" error={errors.date}>
      <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} aria-label="When" />
    </Field>
  )
  const why = (
    <Field label="Why (reason / notes)">
      {inline ? (
        <input className={inputCls} value={f.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Optional — e.g. extra lift requested by client" aria-label="Why" />
      ) : (
        <textarea className={inputCls} rows={2} value={f.reason} onChange={(e) => set('reason', e.target.value)} aria-label="Why" />
      )}
    </Field>
  )

  if (inline) {
    return (
      <form onSubmit={submit} noValidate className="grid grid-cols-12 gap-x-3 gap-y-3" data-testid="quick-add">
        <div className="col-span-5">{jobField}</div>
        <div className="col-span-3">{who}</div>
        <div className="col-span-4">{category}</div>
        <div className="col-span-4">{what}</div>
        <div className="col-span-3">{where}</div>
        <div className="col-span-2">{amount}</div>
        <div className="col-span-3">{date}</div>
        <div className="col-span-9">{why}</div>
        <div className="col-span-3 flex items-end">
          <Button type="submit" variant="primary" className="w-full !py-2.5">
            ＋ Add expense
          </Button>
        </div>
      </form>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {jobField}
      <div className="grid grid-cols-2 gap-4">
        {date}
        {where}
        {who}
        {category}
        {what}
        {amount}
      </div>
      {why}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-500">Amounts in AUD, entered excluding GST.</p>
        <div className="flex gap-2">
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save expense
          </Button>
        </div>
      </div>
    </form>
  )
}
