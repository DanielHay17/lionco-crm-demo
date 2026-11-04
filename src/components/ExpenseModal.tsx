import ExpenseForm from './ExpenseForm'
import { Modal } from './ui'

export default function ExpenseModal({ open, onClose, presetJobId }: { open: boolean; onClose: () => void; presetJobId?: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Log expense" width="max-w-2xl">
      {open && <ExpenseForm presetJobId={presetJobId} onSaved={onClose} onCancel={onClose} />}
    </Modal>
  )
}
