import type { QuoteStatus } from '../lib/types'
import { Badge } from './ui'

const tone: Record<QuoteStatus, 'slate' | 'amber' | 'green' | 'red' | 'dark'> = { draft: 'slate', issued: 'amber', approved: 'green', declined: 'red', superseded: 'slate' }
export default function QuoteBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={tone[status]}>{status === 'issued' ? 'issued (simulated)' : status}</Badge>
}
