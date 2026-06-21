import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="px-6 py-16 text-center">
      <Icon
        size={40}
        className="mx-auto mb-4 text-[var(--admin-text-tertiary)]"
        strokeWidth={1.5}
      />
      <p className="font-body text-base text-white">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md font-body text-sm text-[var(--admin-text-secondary)]">
          {description}
        </p>
      )}
      {action && (
        <Link href={action.href} className="mt-4 inline-block">
          <Button variant="primary">{action.label}</Button>
        </Link>
      )}
    </div>
  )
}
