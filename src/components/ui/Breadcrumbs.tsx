import { Fragment } from 'react'
import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex flex-wrap items-center gap-x-1 font-body text-sm',
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(isLast ? 'text-text-primary' : 'text-text-secondary')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <span className="px-2 font-mono text-text-muted" aria-hidden="true">
                /
              </span>
            ) : null}
          </Fragment>
        )
      })}
    </nav>
  )
}
