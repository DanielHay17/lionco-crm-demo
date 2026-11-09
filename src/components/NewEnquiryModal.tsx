import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { peekNextCode } from '../lib/state'
import { CLIENT_TYPES, SERVICE_TYPES, type ClientType, type ServiceType } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import { Button, Field, inputCls, Modal } from './ui'

const blank = {
  clientId: '', // '' = new client
  client: '',
  clientType: 'Builder' as ClientType,
  serviceType: 'Residential' as ServiceType,
  droneSurvey: false,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  siteContactName: '',
  siteContactPhone: '',
  siteContactEmail: '',
  siteAddress: '',
  suburb: '',
  quote: '',
  notes: '',
}

/** Create customer → job: pick an existing client or create one inline; buyer and site-manager contacts get roles. */
export default function NewEnquiryModal({ open, onClose, presetClientId }: { open: boolean; onClose: () => void; presetClientId?: string }) {
  const { state, createJob } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof blank, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))

  function chooseClient(id: string) {
    const c = state.clients.find((x) => x.id === id)
    const buyer = c?.contacts.find((x) => x.role === 'Buyer')
    const site = c?.contacts.find((x) => x.role === 'Site manager')
    setF((p) => ({
      ...p,
      clientId: id,
      client: c?.name ?? '',
      clientType: c?.type ?? p.clientType,
      contactName: buyer?.name ?? '',
      contactPhone: buyer?.phone ?? '',
      contactEmail: buyer?.email ?? '',
      siteContactName: site?.name ?? '',
      siteContactPhone: site?.phone ?? '',
      siteContactEmail: site?.email ?? '',
    }))
  }
  useEffect(() => {
    if (open && presetClientId) chooseClient(presetClientId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetClientId])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!f.client.trim()) err.client = 'Client name is required'
    if (!f.siteAddress.trim()) err.siteAddress = 'Site address is required'
    if (!f.suburb.trim()) err.suburb = 'Suburb is required'
    const quote = Number(f.quote || 0)
    if (!(quote >= 0) || !Number.isFinite(quote)) err.quote = 'Enter a valid amount'
    setErrors(err)
    if (Object.keys(err).length) return
    const job = createJob({ ...f, clientId: f.clientId || undefined, quote })
    setF(blank)
    onClose()
    nav(`/jobs/${job.id}`)
  }

  const existing = !!f.clientId
  return (
    <Modal open={open} onClose={onClose} title="New enquiry" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
          <div>
            <div className="text-xs font-semibold text-slate-500">Demo job number (auto-assigned)</div>
            <div className="font-mono text-lg font-bold text-brand-600">{peekNextCode(state, new Date())}</div>
          </div>
          <p className="max-w-[18rem] text-xs text-slate-500 sm:text-right">Sequential and never reused. A local simulation — not a Xero number.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client">
            <select className={inputCls} value={f.clientId} onChange={(e) => chooseClient(e.target.value)} aria-label="Existing client or new">
              <option value="">＋ New client…</option>
              {[...state.clients].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Client / company name *" error={errors.client}>
            <input className={inputCls} value={f.client} disabled={existing} onChange={(e) => set('client', e.target.value)} autoFocus={!existing} />
          </Field>
          <Field label="Client type">
            <select className={inputCls} value={f.clientType} disabled={existing} onChange={(e) => set('clientType', e.target.value)}>
              {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Service type">
            <select className={inputCls} value={f.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
              {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <label className="flex min-h-[40px] items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={f.droneSurvey} onChange={(e) => set('droneSurvey', e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Add drone site survey
          </label>
          <Field label="Buyer — name"><input className={inputCls} value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
          <Field label="Buyer — phone"><input className={inputCls} value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
          <Field label="Buyer — email"><input type="email" className={inputCls} value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
          <div className="hidden sm:block" />
          <Field label="Site manager — name (optional)"><input className={inputCls} value={f.siteContactName} onChange={(e) => set('siteContactName', e.target.value)} /></Field>
          <Field label="Site manager — phone"><input className={inputCls} value={f.siteContactPhone} onChange={(e) => set('siteContactPhone', e.target.value)} /></Field>
          <Field label="Site manager — email"><input type="email" className={inputCls} value={f.siteContactEmail} onChange={(e) => set('siteContactEmail', e.target.value)} /></Field>
          <Field label="Estimated value (AUD ex GST)" error={errors.quote} hint="Replaced by the quote builder's sell price once a quote exists">
            <input type="number" min="0" step="100" className={inputCls} value={f.quote} onChange={(e) => set('quote', e.target.value)} />
          </Field>
          <Field label="Site address *" error={errors.siteAddress}><input className={inputCls} value={f.siteAddress} onChange={(e) => set('siteAddress', e.target.value)} placeholder="12 Example St" /></Field>
          <Field label="Suburb *" error={errors.suburb}><input className={inputCls} value={f.suburb} onChange={(e) => set('suburb', e.target.value)} placeholder="Marrickville" /></Field>
        </div>
        <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Create enquiry</Button>
        </div>
      </form>
    </Modal>
  )
}
