const base = import.meta.env.BASE_URL

/** Lion head mark only. */
export function LogoMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <img
      src={`${base}brand/lionco-mark-${dark ? 'dark' : 'white'}.png`}
      alt="Lion & Co Scaffolding"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}

/** Full horizontal wordmark: white for dark backgrounds, dark for light/print. */
export function Wordmark({ dark = false, height = 28, className = '' }: { dark?: boolean; height?: number; className?: string }) {
  return (
    <img
      src={`${base}brand/lionco-logo-${dark ? 'dark' : 'white'}.png`}
      alt="Lion & Co Scaffolding"
      style={{ height, width: 'auto' }}
      className={className}
      draggable={false}
    />
  )
}
