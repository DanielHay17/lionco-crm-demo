import { useEffect, useState } from 'react'

/**
 * Number field that edits freely and commits a valid value on blur/Enter. Invalid input reverts (never stores NaN).
 */
export default function NumInput({
  value,
  onCommit,
  min = 0,
  step = 1,
  className = '',
  label,
  integer,
}: {
  value: number
  onCommit: (n: number) => void
  min?: number
  step?: number
  className?: string
  label: string
  integer?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const n = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(n) && n >= min) {
      const v = integer ? Math.floor(n) : n
      if (v !== value) onCommit(v)
      else setDraft(String(value))
    } else setDraft(String(value))
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      min={min}
      step={step}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`tabular min-h-[36px] w-full rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
    />
  )
}
