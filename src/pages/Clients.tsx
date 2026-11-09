import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Field, inputCls, Modal, PageHeader } from '../components/ui'
import { clientMetrics } from '../lib/clients'
import { money } from '../lib/format'
import { addClient } from '../lib/state'
import { CLIENT_TYPES, type ClientType } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function Clients() {
  const { state, run } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', type: 'Builder' as ClientType, cname: '', cphone: '', cemail: '', notes: '' })
  const [err, setErr] = useState('')
  const rows = useMemo(
    () => state.clients.filter((c) => (!type || c.type === type) && c.name.toLowerCase().includes(q.toLowerCase())).map((c) => ({ c, m: clientMetrics(state, c.id), n: state.jobs.filter((j) => j.clientId === c.id).length })).sort((a, b) => b.m.bookedLtv - a.m.bookedLtv || a.c.name.localeCompare(b.c.name)),
    [state, q, type],
  )

  function create(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Client name is required')
    let id = ''
    run((s, at) => {
      const r = addClient(s, { name: f.name, type: f.type, notes: f.notes, contact: { name: f.cname, phone: f.cphone, email: f.cemail } }, at)
      id = r.client.id
      return r.state
    }, `Client ${f.name.trim()} created — now add a job`)
    setOpen(false)
    setF({ name: '', type: 'Builder', cname: '', cphone: '', cemail: '', notes: '' })
    nav(`/clients/${id}`)
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle="Customer → job → quote. LTV counts approved-or-later work only (see definitions on each client)" actions={<Button variant="primary" onClick={() => setOpen(true)}>＋ New client</Button>} />
      <div className="mb-3 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
        <select className={`${inputCls} max-w-[14rem]`} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by client type">
          <option value="">All types</option>
          {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5 text-right">Jobs</th>
              <th className="px-3 py-2.5 text-right" title="Approved-or-later contract value">LTV booked</th>
              <th className="px-3 py-2.5 text-right" title="Paid or later">LTV paid</th>
              <th className="px-3 py-2.5 text-right">Avg ticket</th>
              <th className="px-4 py-2.5 text-right" title="Issued quotes still open — not in LTV">Quoted (open)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ c, m, n }) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><Link to={`/clients/${c.id}`} className="font-medium text-ink hover:text-brand-600">{c.name}</Link></td>
                <td className="px-3 py-2.5 text-slate-600">{c.type}</td>
                <td className="tabular px-3 py-2.5 text-right">{n}</td>
                <td className="tabular px-3 py-2.5 text-right font-semibold">{money(m.bookedLtv)}</td>
                <td className="tabular px-3 py-2.5 text-right">{money(m.paidLtv)}</td>
                <td className="tabular px-3 py-2.5 text-right">{m.bookedCount ? money(m.avgTicket) : '—'}</td>
                <td className="tabular px-4 py-2.5 text-right text-slate-600">{m.quotedOpen ? money(m.quotedOpen) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}><EmptyState title="No clients match">Try a different search, or add a new client.</EmptyState></td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="New client">
        <form onSubmit={create} className="space-y-3">
          <Field label="Client / company *" error={err}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="Type">
            <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ClientType })}>{CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Buyer name"><input className={inputCls} value={f.cname} onChange={(e) => setF({ ...f, cname: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.cphone} onChange={(e) => setF({ ...f, cphone: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={f.cemail} onChange={(e) => setF({ ...f, cemail: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <p className="text-xs text-slate-500">Use fictional details only — this demo stores everything in your browser with no security.</p>
          <div className="flex justify-end gap-2"><Button type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="primary">Create client</Button></div>
        </form>
      </Modal>
    </div>
  )
}
