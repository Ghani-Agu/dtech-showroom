import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-6 text-center',
        className
      )}
    >
      <div className="mb-6 size-16 rounded-2xl bg-admin-surface-elevated flex items-center justify-center">
        <Icon size={28} strokeWidth={1.5} className="text-text-muted" />
      </div>
      <h3 className="font-display text-xl font-medium text-text-primary mb-2 tracking-tight">
        {title}
      </h3>
      <p className="font-body text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <Link href={action.href}>
          <Button variant="primary">{action.label}</Button>
        </Link>
      )}
    </div>
  )
}
