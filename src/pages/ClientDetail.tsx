import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import MapPanel from '../components/MapPanel'
import NewEnquiryModal from '../components/NewEnquiryModal'
import Notice, { StatusPill } from '../components/Notice'
import { Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, inputCls, ServiceBadge, StageBadge } from '../components/ui'
import { clientMetrics, findClient } from '../lib/clients'
import { fmtDateTime, money } from '../lib/format'
import { addContact, addEmailLog, removeContact, updateClient, updateContact } from '../lib/ops'
import { CLIENT_TYPES, CONTACT_ROLES, type Contact, type Job } from '../lib/types'
import { useStore } from '../store/StoreProvider'

export default function ClientDetail() {
  const { clientId } = useParams()
  const { state, run } = useStore()
  const [jobOpen, setJobOpen] = useState(false)
  const [removing, setRemoving] = useState<Contact | null>(null)
  const [nc, setNc] = useState({ name: '', role: 'Buyer' as Contact['role'], phone: '', email: '' })
  const client = findClient(state, clientId)
  if (!client) return <Navigate to="/clients" replace />
  const m = clientMetrics(state, client.id)

  const jobTable = (jobs: Job[], empty: string) =>
    jobs.length === 0 ? (
      <p className="px-5 py-4 text-sm text-slate-500">{empty}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <tbody className="divide-y divide-slate-100">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-5 py-2"><Link to={`/jobs/${j.id}`} className="font-mono text-xs font-bold text-slate-700 hover:text-brand-600">{j.code}</Link></td>
                <td className="px-3 py-2">{j.siteAddress}, {j.suburb}<div><ServiceBadge service={j.serviceType} drone={j.droneSurvey} /></div></td>
                <td className="px-3 py-2"><StageBadge stage={j.stage} /></td>
                <td className="tabular px-5 py-2 text-right font-semibold">{money(j.quote)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  return (
    <div>
      <nav className="no-print mb-3 text-sm text-slate-500"><Link to="/clients" className="hover:text-ink">Clients</Link> › <span className="font-semibold text-slate-700">{client.name}</span></nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-bold uppercase leading-tight tracking-[0.05em] text-ink">{client.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="Client type" className={`${inputCls} !w-44 !py-1.5`} value={client.type} onChange={(e) => run((s) => updateClient(s, client.id, { type: e.target.value as typeof client.type }))}>
              {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input aria-label="Client name" className={`${inputCls} !w-64 !py-1.5`} defaultValue={client.name} key={client.name} onBlur={(e) => e.target.value.trim() && e.target.value !== client.name && run((s) => updateClient(s, client.id, { name: e.target.value }), 'Client renamed (jobs updated)')} />
          </div>
        </div>
        <Button variant="primary" onClick={() => setJobOpen(true)}>＋ New job for this client</Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="LTV — booked" value={money(m.bookedLtv)} sub={`${m.bookedCount} approved-or-later job${m.bookedCount === 1 ? '' : 's'}`} />
        <Tile label="LTV — paid" value={money(m.paidLtv)} sub="jobs at Paid or later" />
        <Tile label="Average ticket" value={m.bookedCount ? money(m.avgTicket) : '—'} sub="booked LTV ÷ booked jobs" />
        <Tile label="Quoted (open)" value={money(m.quotedOpen)} sub="issued quotes, not in LTV" />
        <Tile label="Declined" value={String(m.declinedCount)} sub="not in LTV" />
      </div>
      <Notice tone="info" title="DEFINITIONS" className="mb-4">
        <b>Booked</b> = contract value of jobs at Approved or later (incl. approved variations). <b>Paid</b> = those at Paid or later. <b>Quoted</b> = issued quotes still awaiting a decision. Enquiries, draft quotes and declined jobs are excluded from LTV and the average. Values are ex GST, demo data.
      </Notice>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Current jobs" sub="Not yet paid or declined" />
            {jobTable(m.current, 'No current jobs.')}
          </Card>
          <Card>
            <CardHeader title="Past jobs & declined" />
            {jobTable(m.past, 'No past jobs yet.')}
          </Card>
          <Card>
            <CardHeader title="Sites on the map" sub="Filter this client's history by stage group, suburb and date" />
            <div className="p-4"><MapPanel clientId={client.id} defaultGroups={['quoted', 'approved', 'erected', 'takedown', 'complete', 'declined']} /></div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Contacts" sub="Fictional contacts — buyer vs site manager roles are used on jobs" />
            <ul className="divide-y divide-slate-100">
              {client.contacts.map((c) => <ContactRow key={c.id} clientId={client.id} c={c} onRemove={() => setRemoving(c)} />)}
              {client.contacts.length === 0 && <li className="px-5 py-3 text-sm text-slate-500">No contacts yet.</li>}
            </ul>
            <form
              className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!nc.name.trim()) return
                run((s) => addContact(s, client.id, nc), 'Contact added')
                setNc({ name: '', role: 'Buyer', phone: '', email: '' })
              }}
            >
              <input aria-label="New contact name" className={inputCls} placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
              <select aria-label="New contact role" className={inputCls} value={nc.role} onChange={(e) => setNc({ ...nc, role: e.target.value as Contact['role'] })}>{CONTACT_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              <input aria-label="New contact phone" className={inputCls} placeholder="Phone" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
              <input aria-label="New contact email" className={inputCls} placeholder="Email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
              <Button type="submit" variant="primary" className="col-span-2" disabled={!nc.name.trim()}>Add contact</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Notes & consent" />
            <div className="space-y-3 p-4">
              <textarea aria-label="Client notes" className={inputCls} rows={3} defaultValue={client.notes} key={client.id} onBlur={(e) => e.target.value !== client.notes && run((s) => updateClient(s, client.id, { notes: e.target.value }), 'Notes saved')} placeholder="Notes (fictional data only)" />
              <label className="flex min-h-[40px] items-center gap-2.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={client.reviewConsent} onChange={(e) => run((s) => updateClient(s, client.id, { reviewConsent: e.target.checked }))} />
                Agreed to follow-up / review requests (demo flag)
              </label>
              <p className="text-[11px] text-slate-500">Only used by the follow-up <i>preview</i> on the Future scope page — nothing is ever sent.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Email activity" right={<StatusPill tone="mock">Gmail: mock</StatusPill>} />
            <div className="space-y-3 p-4">
              <Notice tone="mock">Not connected to Gmail. These are demo entries stored locally; "Log" adds another demo entry. Nothing is read, matched or sent.</Notice>
              {client.emailLog.length === 0 ? <EmptyState title="No logged emails" /> : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                  {client.emailLog.map((e) => (
                    <li key={e.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium text-ink">{e.subject}</span><Badge tone={e.direction === 'in' ? 'slate' : 'dark'}>{e.direction === 'in' ? 'received' : 'sent'}</Badge></div>
                      <div className="text-xs text-slate-500">{e.snippet}</div>
                      <div className="text-[11px] text-slate-400">{fmtDateTime(e.at)} · demo entry{e.jobId ? ` · ${state.jobs.find((j) => j.id === e.jobId)?.code ?? ''}` : ''}</div>
                    </li>
                  ))}
                </ul>
              )}
              <Button size="sm" onClick={() => run((s, at) => addEmailLog(s, client.id, { at, direction: 'in', subject: 'Demo: follow-up question about the scaffold', snippet: 'Placeholder text generated locally to show per-client email logging.' }), 'Demo email entry logged locally (Gmail not connected)', 'info')}>
                ＋ Log a demo email entry
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <NewEnquiryModal open={jobOpen} onClose={() => setJobOpen(false)} presetClientId={client.id} />
      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} title="Remove contact?" confirmLabel="Remove" message={`Remove ${removing?.name ?? ''}? Jobs that used them as buyer or site manager will show no contact for that role.`} onConfirm={() => removing && run((s) => removeContact(s, client.id, removing.id), 'Contact removed', 'info')} />
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="tabular mt-1 text-xl font-bold text-ink">{value}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </Card>
  )
}

function ContactRow({ clientId, c, onRemove }: { clientId: string; c: Contact; onRemove: () => void }) {
  const { run } = useStore()
  const [d, setD] = useState(c)
  const save = (p: Partial<Contact>) => {
    const n = { ...d, ...p }
    setD(n)
    if (n.name.trim()) run((s) => updateContact(s, clientId, n))
  }
  return (
    <li className="grid grid-cols-2 gap-2 px-4 py-3">
      <input aria-label={`Name of ${c.name}`} className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} onBlur={() => d.name.trim() ? d.name !== c.name && save({}) : setD(c)} />
      <select aria-label={`Role of ${c.name}`} className={inputCls} value={d.role} onChange={(e) => save({ role: e.target.value as Contact['role'] })}>{CONTACT_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
      <input aria-label={`Phone of ${c.name}`} className={inputCls} value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} onBlur={() => d.phone !== c.phone && save({})} />
      <input aria-label={`Email of ${c.name}`} className={inputCls} value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} onBlur={() => d.email !== c.email && save({})} />
      <button onClick={onRemove} className="col-span-2 min-h-[32px] rounded text-left text-xs font-semibold text-red-600 hover:underline">Remove contact</button>
    </li>
  )
}
