import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreProvider'
import { Button, Field, inputCls, Modal } from './ui'

/** Asks for a decline reason, then declines the job (and its active quote) via the lifecycle choke-point. */
export default function DeclineModal({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { state, moveJob } = useStore()
  const [reason, setReason] = useState('')
  useEffect(() => setReason(''), [jobId])
  const job = state.jobs.find((j) => j.id === jobId)
  return (
    <Modal open={!!job} onClose={onClose} title={`Decline ${job?.code ?? ''}`} width="max-w-md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!job) return
          moveJob(job.id, 'Declined', reason.trim() || 'No reason recorded')
          onClose()
        }}
      >
        <p className="text-sm text-slate-600">
          Marks the job and its active quote as declined (simulated — nobody is notified). Declined jobs stay in history and can be re-opened to Enquiry or Quote.
        </p>
        <Field label="Reason (optional)">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="e.g. Went with another supplier" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Decline job
          </Button>
        </div>
      </form>
    </Modal>
  )
}
