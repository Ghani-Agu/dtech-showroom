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
  new: 'Nouvelle',
  contacted: 'Contactée',
  closed: 'Clôturée',
  spam: 'Indésirable',
}

export function InquiryListRow({ inquiry }: InquiryListRowProps) {
  const submittedAt = new Date(inquiry.submittedAt)
  return (
    <Link
      href={`/admin/inquiries/${inquiry.id}`}
      className="block px-6 py-4 transition-[transform,background-color] duration-200 ease-[var(--admin-ease)] hover:translate-x-1 hover:bg-[var(--admin-cyan)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3">
            <p className="truncate font-body text-base font-medium text-white">
              {inquiry.fullName}
            </p>
            <Badge variant={statusVariant[inquiry.status]}>
              {statusLabel[inquiry.status]}
            </Badge>
          </div>
          <p className="truncate font-body text-sm text-[var(--admin-text-secondary)]">
            {inquiry.email}
            {inquiry.company && (
              <span className="text-[var(--admin-text-tertiary)]">
                {' '}
                · {inquiry.company}
              </span>
            )}
          </p>
          <p className="mt-1 truncate font-body text-sm text-[var(--admin-text-tertiary)]">
            Concerne{' '}
            <span className="text-[var(--admin-text-secondary)]">
              {inquiry.productName}
            </span>
          </p>
        </div>
        <time
          dateTime={submittedAt.toISOString()}
          className="mt-1 whitespace-nowrap font-mono text-xs text-[var(--admin-text-tertiary)]"
        >
          {new Intl.DateTimeFormat('fr-FR', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(submittedAt)}
        </time>
      </div>
    </Link>
  )
}
