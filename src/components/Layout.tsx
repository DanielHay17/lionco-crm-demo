import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreProvider'
import { LogoMark, Wordmark } from './Logo'
import { ConfirmModal } from './ui'

interface NavItem {
  to: string
  label: string
  icon: string
  tag?: 'mock' | 'future'
}
const ICON = {
  dash: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  pipe: 'M4 4h4v16H4V4zm6 0h4v10h-4V4zm6 0h4v13h-4V4z',
  jobs: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zm-10-2h4v2h-4V5z',
  people: 'M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 1.9 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z',
  quote: 'M6 2h9l5 5v15H6V2zm8 1.5V8h4.5L14 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z',
  map: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 119.5 9 2.5 2.5 0 0112 11.5z',
  site: 'M12 2l9 4v6c0 5-3.8 9.3-9 10-5.2-.7-9-5-9-10V6l9-4zm-1 13l6-6-1.4-1.4L11 12.2 8.4 9.6 7 11l4 4z',
  money: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-1.1a3 3 0 01-2-2.4h2c.1.6.6 1 1.2 1 .7 0 1.3-.4 1.3-1 0-1.5-4.4-.9-4.4-3.7 0-1.2.9-2.2 1.9-2.5V7h2v1.1c1 .2 1.8 1 2 2.1h-2c-.1-.5-.5-.8-1.1-.8-.7 0-1.2.4-1.2.9 0 1.5 4.4.8 4.4 3.7 0 1.3-1 2.3-2.1 2.6V17z',
  truck: 'M3 6h11v9H3V6zm11 3h4l3 3v3h-7V9zM7 20a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z',
  kit: 'M4 5h16v3H4V5zm0 5.5h16v3H4v-3zM4 16h16v3H4v-3z',
  plug: 'M16 7V2h-2v5h-4V2H8v5H6v6a4 4 0 004 4v5h4v-5a4 4 0 004-4V7h-2z',
  road: 'M3 17l6-6 4 4 8-8v4h2V3h-8v2h4l-6 6-4-4-8 8 2 2z',
}
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core workflow',
    items: [
      { to: '/', label: 'Dashboard', icon: ICON.dash },
      { to: '/pipeline', label: 'Pipeline', icon: ICON.pipe },
      { to: '/clients', label: 'Clients', icon: ICON.people },
      { to: '/jobs', label: 'Jobs', icon: ICON.jobs },
      { to: '/quotes', label: 'Quotes', icon: ICON.quote },
      { to: '/map', label: 'Map', icon: ICON.map },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/packing', label: 'Truck Packing', icon: ICON.truck },
      { to: '/catalogue', label: 'Kit & Inventory', icon: ICON.kit },
      { to: '/site', label: 'Site & Inspections', icon: ICON.site },
      { to: '/expenses', label: 'Expenses', icon: ICON.money },
    ],
  },
  {
    title: 'Mock & future',
    items: [
      { to: '/integrations', label: 'Integrations', icon: ICON.plug, tag: 'mock' },
      { to: '/roadmap', label: 'Future scope', icon: ICON.road, tag: 'future' },
    ],
  },
]

export default function Layout() {
  const { resetDemo } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    setMenu(false)
  }, [pathname])

  const sidebar = (
    <>
      <div className="px-2 pb-5 max-lg:hidden">
        <Wordmark height={27} />
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto pr-0.5" aria-label="Main">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{g.title}</div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    `group flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-medium tracking-[0.04em] transition-colors ${
                      isActive ? 'bg-brand-600 text-white shadow-[inset_3px_0_0_#fff]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-90">
                    <path d={n.icon} />
                  </svg>
                  <span className="flex-1">{n.label}</span>
                  {n.tag && <span className="rounded bg-white/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white/70">{n.tag}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" /> Demo build
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">Fictional data only. Saved in this browser (localStorage) — no sign-in, no backups, nothing is sent.</p>
        <button onClick={() => setConfirm(true)} className="mt-2.5 min-h-[36px] w-full rounded-md border border-white/20 px-2 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10">
          ↺ Reset demo data
        </button>
      </div>
    </>
  )

  return (
    <div className="app-shell flex min-h-screen flex-col lg:flex-row">
      {/* phone / tablet top bar */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-2.5 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-display text-sm font-bold uppercase tracking-[0.12em]">Lion & Co · Demo</span>
        </div>
        <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-nav" className="min-h-[44px] min-w-[44px] rounded-lg px-3 text-sm font-semibold hover:bg-white/10">
          {menu ? '✕ Close' : '☰ Menu'}
        </button>
      </header>
      {menu && (
        <div id="mobile-nav" className="no-print fixed inset-0 top-[52px] z-30 flex flex-col overflow-y-auto bg-ink px-3 pb-4 pt-4 text-slate-300 lg:hidden">
          {sidebar}
        </div>
      )}
      <aside className="no-print sticky top-0 hidden h-screen w-[224px] shrink-0 flex-col bg-ink px-3 pb-4 pt-6 text-slate-300 lg:flex">{sidebar}</aside>
      <main className="app-main min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
        <div key={pathname} className="page-enter mx-auto max-w-[1280px]">
          <Outlet />
        </div>
      </main>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        confirmLabel="Reset"
        message="This restores all clients, jobs, quotes, stock, expenses, kit lists and packing checklists to the original example data. Any changes you've made will be lost."
        onConfirm={resetDemo}
      />
    </div>
  )
}
