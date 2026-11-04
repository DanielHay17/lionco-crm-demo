export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0f172a" />
      <g stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="square" fill="none">
        <path d="M9 6v20M23 6v20M9 11h14M9 17h14M9 23h14M9 23L23 11" />
      </g>
    </svg>
  )
}

export function Wordmark({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className={`text-[17px] font-extrabold tracking-[0.14em] ${dark ? 'text-white' : 'text-slate-900'}`}>LIONCO</div>
        <div className={`mt-1 text-[9.5px] font-semibold tracking-[0.34em] ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
          SCAFFOLDING
        </div>
      </div>
    </div>
  )
}
