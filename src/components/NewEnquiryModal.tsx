import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { peekNextCode } from '../lib/state'
import { CLIENT_TYPES, SERVICE_TYPES, type ClientType, type ServiceType } from '../lib/types'
import { useStore } from '../store/StoreProvider'
import { Button, Field, inputCls, Modal } from './ui'

const blank = {
  client: '',
  clientType: 'Builder' as ClientType,
  serviceType: 'Residential' as ServiceType,
  droneSurvey: false,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  siteAddress: '',
  suburb: '',
  quote: '',
  notes: '',
}

export default function NewEnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, createJob } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof blank, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!f.client.trim()) err.client = 'Client name is required'
    if (!f.siteAddress.trim()) err.siteAddress = 'Site address is required'
    if (!f.suburb.trim()) err.suburb = 'Suburb is required'
    const quote = Number(f.quote || 0)
    if (!(quote >= 0)) err.quote = 'Enter a valid amount'
    setErrors(err)
    if (Object.keys(err).length) return
    const job = createJob({ ...f, quote })
    setF(blank)
    onClose()
    nav(`/jobs/${job.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="New enquiry" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
          <div>
            <div className="text-xs font-semibold text-slate-500">Job code (auto-assigned)</div>
            <div className="font-mono text-lg font-bold text-brand-600">{peekNextCode(state, new Date())}</div>
          </div>
          <p className="max-w-[16rem] text-right text-xs text-slate-500">Codes are sequential and can't be typed — so costs never get split by a typo.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client / company *" error={errors.client}>
            <input className={inputCls} value={f.client} onChange={(e) => set('client', e.target.value)} autoFocus />
          </Field>
          <Field label="Client type">
            <select className={inputCls} value={f.clientType} onChange={(e) => set('clientType', e.target.value)}>
              {CLIENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Service type">
            <select className={inputCls} value={f.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
              {SERVICE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2.5 self-end rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={f.droneSurvey}
              onChange={(e) => set('droneSurvey', e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Add drone site survey
          </label>
          <Field label="Contact name">
            <input className={inputCls} value={f.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
          </Field>
          <Field label="Estimated quote value (AUD)" error={errors.quote}>
            <input type="number" min="0" step="100" className={inputCls} value={f.quote} onChange={(e) => set('quote', e.target.value)} />
          </Field>
          <Field label="Site address *" error={errors.siteAddress}>
            <input className={inputCls} value={f.siteAddress} onChange={(e) => set('siteAddress', e.target.value)} placeholder="12 Example St" />
          </Field>
          <Field label="Suburb *" error={errors.suburb}>
            <input className={inputCls} value={f.suburb} onChange={(e) => set('suburb', e.target.value)} placeholder="Marrickville" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create enquiry
          </Button>
        </div>
      </form>
    </Modal>
  )
}
