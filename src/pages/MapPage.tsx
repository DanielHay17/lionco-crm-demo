import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MapPanel, { MapNote } from '../components/MapPanel'
import { Card, CardHeader, EmptyState, inputCls, PageHeader } from '../components/ui'
import { suburbRevenue } from '../lib/analytics'
import { money } from '../lib/format'
import { useStore } from '../store/StoreProvider'

export default function MapPage() {
  const { state } = useStore()
  const [basis, setBasis] = useState<'booked' | 'paid'>('booked')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rows = useMemo(() => suburbRevenue(state, { basis, from: from || undefined, to: to || undefined }), [state, basis, from, to])
  const max = Math.max(1, ...rows.map((r) => r.revenue))
  const total = rows.reduce((a, r) => a + r.revenue, 0)
  return (
    <div>
      <PageHeader title="Company Map" subtitle="Every fictional job on a Sydney street map. Pan and zoom, then open a pin or a row." />
      <p className="mb-3 text-sm text-slate-600">
        Same OpenStreetMap as <Link to="/analytics" className="font-semibold text-brand-600">Analytics</Link>. Revenue by area lives there. This page keeps the stage filters and the job list.
      </p>
      <MapNote />
      <Card className="mb-4 mt-3 p-4"><MapPanel /></Card>
      <Card>
        <CardHeader title="Revenue by suburb (light demo analytics)" sub="Booked = approved-or-later contract value by approval date · Paid = paid jobs by paid date. Declined, draft and quoted-only jobs are excluded." />
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <label className="text-xs font-semibold text-slate-600">Basis
            <select className={`${inputCls} mt-1 !w-36`} value={basis} onChange={(e) => setBasis(e.target.value as 'booked' | 'paid')}>
              <option value="booked">Booked</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">From<input type="date" className={`${inputCls} mt-1 !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs font-semibold text-slate-600">To<input type="date" className={`${inputCls} mt-1 !w-40`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <span className="ml-auto text-sm font-semibold text-ink">Total {money(total)}</span>
        </div>
        {rows.length === 0 ? <EmptyState title="No revenue in this range">Try widening the dates.</EmptyState> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.suburb} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-32 shrink-0 font-medium text-ink">{r.suburb}</span>
                <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="absolute inset-y-0 left-0 rounded-full bg-brand-600" style={{ width: `${(r.revenue / max) * 100}%` }} /></span>
                <span className="tabular w-24 text-right font-semibold">{money(r.revenue)}</span>
                <span className="w-14 text-right text-xs text-slate-500">{r.jobs} job{r.jobs === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
