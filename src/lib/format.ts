const aud0 = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const aud2 = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })

export const money = (n: number) => aud0.format(n)
export const money2 = (n: number) => aud2.format(n)
export const kg = (n: number) => `${n.toLocaleString('en-AU', { maximumFractionDigits: 1 })} kg`
export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`

export function fmtDate(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const monthKey = (d: Date) => ymd(d).slice(0, 7)
