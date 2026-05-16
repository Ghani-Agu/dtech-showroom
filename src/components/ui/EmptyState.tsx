import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  href: string
}

interface EmptyStateProps {
  message: string
  actions?: EmptyStateAction[]
  className?: string
}

export function EmptyState({ message, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 py-24 text-center',
        className
      )}
    >
      <p className="max-w-md font-body text-lg text-text-secondary">{message}</p>
      {actions && actions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group inline-flex items-baseline gap-2 font-body text-base text-text-primary"
            >
              <span className="border-b border-text-muted pb-0.5 transition-colors group-hover:border-accent">
                {action.label}
              </span>
              <span aria-hidden="true" className="text-accent">→</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
