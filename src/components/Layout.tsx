import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/StoreProvider'
import { Wordmark } from './Logo'
import { ConfirmModal } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { to: '/pipeline', label: 'Pipeline', icon: 'M4 4h4v16H4V4zm6 0h4v10h-4V4zm6 0h4v13h-4V4z' },
  { to: '/jobs', label: 'Jobs', icon: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zm-10-2h4v2h-4V5z' },
  { to: '/expenses', label: 'Expenses', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-1.1a3 3 0 01-2-2.4h2c.1.6.6 1 1.2 1 .7 0 1.3-.4 1.3-1 0-1.5-4.4-.9-4.4-3.7 0-1.2.9-2.2 1.9-2.5V7h2v1.1c1 .2 1.8 1 2 2.1h-2c-.1-.5-.5-.8-1.1-.8-.7 0-1.2.4-1.2.9 0 1.5 4.4.8 4.4 3.7 0 1.3-1 2.3-2.1 2.6V17z' },
  { to: '/packing', label: 'Truck Packing', icon: 'M3 6h11v9H3V6zm11 3h4l3 3v3h-7V9zM7 20a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z' },
  { to: '/catalogue', label: 'Kit Catalogue', icon: 'M4 5h16v3H4V5zm0 5.5h16v3H4v-3zM4 16h16v3H4v-3z' },
]

export default function Layout() {
  const { resetDemo } = useStore()
  const [confirm, setConfirm] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-52 shrink-0 flex-col bg-slate-900 px-3 py-5 text-slate-300">
        <div className="px-2 pb-6">
          <Wordmark />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-800 text-white shadow-[inset_3px_0_0_#f59e0b]' : 'hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                <path d={n.icon} />
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-lg border border-slate-700/70 bg-slate-800/50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Demo build</div>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">Fictional data only. Saved in this browser.</p>
          <button
            onClick={() => setConfirm(true)}
            className="mt-2.5 w-full rounded-md border border-slate-600 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            ↺ Reset demo data
          </button>
        </div>
      </aside>
      <main className="app-main min-w-0 flex-1 px-6 py-6">
        <div className="mx-auto max-w-[1280px]">
          <Outlet />
        </div>
      </main>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        confirmLabel="Reset"
        message="This restores all jobs, expenses, kit lists and packing checklists to the original example data. Any changes you've made will be lost."
        onConfirm={resetDemo}
      />
    </div>
  )
}
