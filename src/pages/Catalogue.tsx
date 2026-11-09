import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumInput from '../components/NumInput'
import Notice from '../components/Notice'
import { Badge, Button, Card, CardHeader, Field, inputCls, Modal, PageHeader } from '../components/ui'
import { money2 } from '../lib/format'
import { stockRows } from '../lib/inventory'
import { defaultPricing } from '../lib/kitPricing'
import { updateKitItem, updateSettings } from '../lib/ops'
import { crewSize } from '../lib/crew'
import { useStore } from '../store/StoreProvider'

export default function Catalogue() {
  const { state, addCatalogueItem, run } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', weight: '' })
  const [err, setErr] = useState('')
  const [calc, setCalc] = useState({ hours: '120', days: '3', hpd: '8' })

  const categories = useMemo(() => [...new Set(state.catalogue.map((c) => c.category))], [state.catalogue])
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    for (const j of state.jobs) for (const k of j.kit) m.set(k.itemId, (m.get(k.itemId) ?? 0) + 1)
    return m
  }, [state.jobs])
  const stock = useMemo(() => stockRows(state), [state])
  const rows = stock.filter((r) => (!cat || r.item.category === cat) && r.item.name.toLowerCase().includes(q.toLowerCase()))
  const short = stock.filter((r) => r.available <= 0 && r.reserved > 0)
  const set = (id: string, p: Parameters<typeof updateKitItem>[2]) => run((s) => updateKitItem(s, id, p))
  const st = state.settings
  const crew = crewSize(Number(calc.hours), Number(calc.days), Number(calc.hpd))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = Number(form.weight)
    if (!form.name.trim() || !form.category.trim() || !(w > 0)) {
      setErr('Name, category and a unit weight above 0 are required.')
      return
    }
    addCatalogueItem({ name: form.name.trim(), category: form.category.trim(), unitWeightKg: w, ownedQty: 0, ...defaultPricing({ unitWeightKg: w, category: form.category }) })
    setForm({ name: '', category: '', weight: '' })
    setErr('')
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Kit & Inventory"
        subtitle="Editable stock, fictional price list, labour hours and crew assumptions — feeds quotes, packing and shortage warnings"
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            ＋ Add item
          </Button>
        }
      />
      <Notice tone="info" className="mb-4">
        All quantities, prices and labour hours are <b>fictional demo values</b> that stand in for an existing spreadsheet. Edit any cell; changes save in this browser only.
        Reserved = kit on jobs from <i>Approved</i> until <i>Warehouse return</i>; quoted (not yet approved) jobs are not reserved.
      </Notice>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Crew & pricing assumptions" sub="Defaults used by new quotes (editable, fictional)" />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {(
              [
                ['defaultHireWeeks', 'Hire period (weeks)'],
                ['defaultCrewDays', 'Crew days'],
                ['defaultHoursPerDay', 'Hours / person / day'],
                ['labourCostRate', 'Labour cost $/h (internal)'],
                ['labourChargeRate', 'Labour charge $/h'],
                ['defaultDepositPct', 'Demo deposit %'],
                ['inspectionIntervalDays', 'Inspection reminder (days)'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block text-xs font-semibold text-slate-600">
                {label}
                <NumInput label={label} value={st[k]} onCommit={(n) => run((s) => updateSettings(s, { [k]: n }))} />
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Crew formula calculator" sub="people = ceil( total person-hours ÷ (days × hours per day) )" />
          <div className="grid grid-cols-3 gap-3 p-4">
            <Field label="Total person-hours">
              <input className={inputCls} inputMode="decimal" value={calc.hours} onChange={(e) => setCalc({ ...calc, hours: e.target.value })} />
            </Field>
            <Field label="Days">
              <input className={inputCls} inputMode="decimal" value={calc.days} onChange={(e) => setCalc({ ...calc, days: e.target.value })} />
            </Field>
            <Field label="Hours / day">
              <input className={inputCls} inputMode="decimal" value={calc.hpd} onChange={(e) => setCalc({ ...calc, hpd: e.target.value })} />
            </Field>
            <div className="col-span-3 rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200" aria-live="polite">
              {crew.valid ? (
                <>
                  Crew needed: <b className="text-lg text-ink">{crew.people}</b> {crew.people === 1 ? 'person' : 'people'}
                </>
              ) : (
                <span className="font-semibold text-red-600">{crew.reason}</span>
              )}
              <p className="mt-1 text-xs text-slate-500">Planning aid only (demo assumption) — not a staffing or safety rule. Quotes derive hours from kit quantities × labour hours per unit below.</p>
            </div>
          </div>
        </Card>
      </div>

      {short.length > 0 && (
        <Notice tone="warn" className="mb-3">
          Fully reserved / over-committed: {short.map((r) => r.item.name).join(', ')}.
        </Notice>
      )}

      <div className="mb-3 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
        <select className={`${inputCls} max-w-[14rem]`} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Item</th>
              <th className="px-2 py-2.5 text-right">Unit kg</th>
              <th className="px-2 py-2.5 text-right">Owned</th>
              <th className="px-2 py-2.5 text-right">Reserved</th>
              <th className="px-2 py-2.5 text-right">Available</th>
              <th className="px-2 py-2.5 text-right">Rent $/wk</th>
              <th className="px-2 py-2.5 text-right">Cost $/wk</th>
              <th className="px-2 py-2.5 text-right">Labour h/unit</th>
              <th className="px-4 py-2.5 text-right">Jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ item: c, reserved, available }) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-1.5">
                  <div className="font-medium text-ink">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.category}</div>
                </td>
                <td className="w-24 px-2 py-1.5"><NumInput label={`Unit weight of ${c.name}`} value={c.unitWeightKg} step={0.1} min={0.1} onCommit={(n) => set(c.id, { unitWeightKg: n })} /></td>
                <td className="w-24 px-2 py-1.5"><NumInput label={`Owned quantity of ${c.name}`} value={c.ownedQty} integer onCommit={(n) => set(c.id, { ownedQty: n })} /></td>
                <td className="tabular px-2 py-1.5 text-right text-slate-600">{reserved}</td>
                <td className="px-2 py-1.5 text-right">
                  {available < 0 ? <Badge tone="red">short {-available}</Badge> : available === 0 && reserved > 0 ? <Badge tone="amber">0 left</Badge> : <span className="tabular font-semibold">{available}</span>}
                </td>
                <td className="w-24 px-2 py-1.5"><NumInput label={`Weekly rental price of ${c.name}`} value={c.weeklyRentalPrice} step={0.05} onCommit={(n) => set(c.id, { weeklyRentalPrice: n })} /></td>
                <td className="w-24 px-2 py-1.5"><NumInput label={`Weekly cost of ${c.name}`} value={c.weeklyCost} step={0.05} onCommit={(n) => set(c.id, { weeklyCost: n })} /></td>
                <td className="w-24 px-2 py-1.5"><NumInput label={`Labour hours per unit of ${c.name}`} value={c.labourHoursPerUnit} step={0.01} onCommit={(n) => set(c.id, { labourHoursPerUnit: n })} /></td>
                <td className="tabular px-4 py-1.5 text-right text-slate-500">{usage.get(c.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-slate-500">
        Rental price is shown to customers; cost and labour hours are internal. Example: 10 × {money2(1.5)} × {st.defaultHireWeeks} weeks = {money2(10 * 1.5 * st.defaultHireWeeks)}.{' '}
        <Link to="/quotes" className="font-semibold text-brand-600">
          Build a quote →
        </Link>
      </p>
      <Modal open={open} onClose={() => setOpen(false)} title="Add catalogue item">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Item name *">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Category *">
            <input className={inputCls} list="cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Unit weight (kg) *" hint="Price and labour hours get fictional defaults you can edit afterwards; owned quantity starts at 0.">
            <input type="number" step="0.1" min="0" className={inputCls} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Field>
          {err && <p className="text-sm font-medium text-red-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
