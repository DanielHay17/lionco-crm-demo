import { useMemo, useState } from 'react'
import { Button, Card, Field, inputCls, Modal, PageHeader } from '../components/ui'
import { useStore } from '../store/StoreProvider'

export default function Catalogue() {
  const { state, addCatalogueItem } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', weight: '' })
  const [err, setErr] = useState('')

  const categories = useMemo(() => [...new Set(state.catalogue.map((c) => c.category))], [state.catalogue])
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    for (const j of state.jobs) for (const k of j.kit) m.set(k.itemId, (m.get(k.itemId) ?? 0) + 1)
    return m
  }, [state.jobs])
  const rows = state.catalogue.filter((c) => (!cat || c.category === cat) && c.name.toLowerCase().includes(q.toLowerCase()))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = Number(form.weight)
    if (!form.name.trim() || !form.category.trim() || !(w > 0)) {
      setErr('Name, category and a unit weight above 0 are required.')
      return
    }
    addCatalogueItem({ name: form.name.trim(), category: form.category.trim(), unitWeightKg: w })
    setForm({ name: '', category: '', weight: '' })
    setErr('')
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Kit Catalogue"
        subtitle="Scaffold components and unit weights — used for job kit lists and truck load balancing"
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            ＋ Add item
          </Button>
        }
      />
      <div className="mb-3 flex gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} max-w-[14rem]`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Item</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5 text-right">Unit weight</th>
              <th className="px-4 py-2.5 text-right">Used on jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-amber-50/40">
                <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                <td className="px-3 py-2 text-slate-600">{c.category}</td>
                <td className="tabular px-3 py-2 text-right font-semibold">{c.unitWeightKg} kg</td>
                <td className="tabular px-4 py-2 text-right text-slate-500">{usage.get(c.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
          <Field label="Unit weight (kg) *">
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
