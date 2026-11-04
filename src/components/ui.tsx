import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { marginStatus, type Financials, type MarginStatus } from '../lib/profit'
import { pct, money } from '../lib/format'
import { STAGES, type Stage } from '../lib/types'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}

export function CardHeader({ title, right, sub }: { title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-medium',
  ghost: 'text-slate-600 hover:bg-slate-100 font-medium',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 font-medium',
}
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
      } ${variants[variant]} ${className}`}
    />
  )
}

const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  dark: 'bg-slate-800 text-white ring-slate-800',
}
export function Badge({ tone = 'slate', children, title }: { tone?: keyof typeof tones; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

const marginTone: Record<MarginStatus, keyof typeof tones> = { healthy: 'green', thin: 'amber', loss: 'red' }
export function marginColor(f: Pick<Financials, 'profit' | 'marginPct'>) {
  return { healthy: 'text-emerald-600', thin: 'text-amber-600', loss: 'text-red-600' }[marginStatus(f)]
}
export function MarginBadge({ f, compact }: { f: Financials; compact?: boolean }) {
  const st = marginStatus(f)
  const label = { healthy: 'Healthy', thin: 'Thin', loss: 'Loss' }[st]
  return (
    <Badge tone={marginTone[st]} title={`${label} margin`}>
      {f.profit < 0 ? '−' : ''}
      {money(Math.abs(f.profit))}
      {!compact && <span className="opacity-70">· {pct(f.marginPct)}</span>}
    </Badge>
  )
}

export const stageDot: Record<Stage, string> = {
  Enquiry: 'bg-slate-400',
  Quote: 'bg-sky-400',
  Approved: 'bg-indigo-400',
  'Job in progress': 'bg-amber-500',
  Invoiced: 'bg-violet-400',
  Paid: 'bg-emerald-500',
  'Google review requested': 'bg-teal-500',
}
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      <span className={`h-2 w-2 rounded-full ${stageDot[stage]}`} />
      {stage}
    </span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-auto rounded-2xl bg-white shadow-2xl ${width}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200'

export function StageStepper({ stage, onSelect }: { stage: Stage; onSelect: (s: Stage) => void }) {
  const idx = STAGES.indexOf(stage)
  return (
    <ol className="flex items-center gap-1">
      {STAGES.map((s, i) => {
        const done = i < idx
        const cur = i === idx
        return (
          <li key={s} className="flex flex-1 items-center">
            <button
              onClick={() => onSelect(s)}
              title={`Set stage: ${s}`}
              className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition-colors hover:bg-slate-100`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  cur ? 'bg-amber-500 text-slate-900 ring-4 ring-amber-100' : done ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-[10.5px] leading-tight ${cur ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{s}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
