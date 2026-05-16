import Link from 'next/link'
import { Badge } from '@/components/admin/ui/Badge'
import type { Inquiry } from '@/db/schema'

interface InquiryListRowProps {
  inquiry: Inquiry
}

const statusVariant = {
  new: 'accent' as const,
  contacted: 'success' as const,
  closed: 'neutral' as const,
  spam: 'error' as const,
}

const statusLabel = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
  spam: 'Spam',
}

export function InquiryListRow({ inquiry }: InquiryListRowProps) {
  const submittedAt = new Date(inquiry.submittedAt)
  return (
    <li>
      <Link
        href={`/admin/inquiries/${inquiry.id}`}
        className="block px-6 py-4 transition-colors hover:bg-surface-overlay/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-3">
              <p className="truncate font-body text-base font-medium text-text-primary">
                {inquiry.fullName}
              </p>
              <Badge variant={statusVariant[inquiry.status]}>
                {statusLabel[inquiry.status]}
              </Badge>
            </div>
            <p className="truncate font-body text-sm text-text-secondary">
              {inquiry.email}
              {inquiry.company && (
                <span className="text-text-muted"> · {inquiry.company}</span>
              )}
            </p>
            <p className="mt-1 truncate font-body text-sm text-text-muted">
              About{' '}
              <span className="text-text-secondary">
                {inquiry.productName}
              </span>
            </p>
          </div>
          <time
            dateTime={submittedAt.toISOString()}
            className="mt-1 whitespace-nowrap font-mono text-xs text-text-muted"
          >
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(submittedAt)}
          </time>
        </div>
      </Link>
    </li>
  )
}
