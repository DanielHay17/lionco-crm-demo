import { useMemo, useRef, useState } from 'react'
import type { Job } from '../lib/types'

export const jobLabel = (j: Job) => `${j.code} — ${j.siteAddress}, ${j.suburb}`

/**
 * Searchable select restricted to existing job codes. Typing only filters the list —
 * the value can only ever be a real job id chosen from it (no free text).
 */
export default function JobPicker({
  jobs,
  value,
  onChange,
  error,
  testId = 'expense-job',
}: {
  jobs: Job[]
  value: string
  onChange: (jobId: string) => void
  error?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = jobs.find((j) => j.id === value)
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return jobs.filter((j) => !needle || `${jobLabel(j)} ${j.client}`.toLowerCase().includes(needle))
  }, [jobs, q])

  const choose = (j: Job) => {
    onChange(j.id)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        data-testid={testId}
        role="combobox"
        aria-expanded={open}
        aria-controls="job-picker-list"
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? q : selected ? jobLabel(selected) : ''}
        placeholder="Search job code, address or client…"
        onFocus={() => {
          setOpen(true)
          setQ('')
          setHi(0)
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQ(e.target.value)
          setHi(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setHi((h) => Math.min(h + 1, list.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHi((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter' && open) {
            e.preventDefault()
            if (list[hi]) choose(list[hi])
          } else if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className={`w-full rounded-lg border bg-white px-3 py-2 pr-8 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">▾</span>
      {open && (
        <ul
          id="job-picker-list"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full min-w-[22rem] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {list.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No job code matches “{q}”. Job codes can't be typed in — pick an existing one.</li>}
          {list.map((j, i) => (
            <li
              key={j.id}
              role="option"
              aria-selected={j.id === value}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(j)
              }}
              onMouseEnter={() => setHi(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === hi ? 'bg-brand-50' : ''}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs font-bold text-brand-600">{j.code}</span>
                <span className="truncate text-slate-800">
                  {j.siteAddress}, {j.suburb}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {j.client} · {j.stage}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
