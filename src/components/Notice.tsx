import type { ReactNode } from 'react'

const tones = {
  mock: 'border-amber-300 bg-amber-50 text-amber-900',
  future: 'border-slate-300 bg-slate-100 text-slate-700',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
  warn: 'border-red-200 bg-red-50 text-red-800',
}
const labels = { mock: 'MOCK / DISCONNECTED', future: 'FUTURE — NOT BUILT', info: 'DEMO NOTE', warn: 'WARNING' }

/** Honest status banner used wherever something is simulated, mocked or not built yet. */
export default function Notice({ tone = 'info', title, children, className = '' }: { tone?: keyof typeof tones; title?: string; children: ReactNode; className?: string }) {
  return (
    <div role="note" className={`no-print rounded-lg border px-3.5 py-2.5 text-[13px] leading-snug ${tones[tone]} ${className}`}>
      <span className="mr-2 rounded bg-white/70 px-1.5 py-0.5 font-display text-[10.5px] font-bold tracking-[0.12em]">{title ?? labels[tone]}</span>
      {children}
    </div>
  )
}

export function StatusPill({ tone, children }: { tone: 'mock' | 'future' | 'live'; children: ReactNode }) {
  const cls = tone === 'live' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : tone === 'mock' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-100 text-slate-600 ring-slate-300'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ring-1 ring-inset ${cls}`}>{children}</span>
}
