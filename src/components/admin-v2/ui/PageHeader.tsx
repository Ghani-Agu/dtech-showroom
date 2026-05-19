import Link from 'next/link'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  action?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-admin-text-muted">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-admin-text-secondary transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && (
                    <span className="text-admin-text-muted">/</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-medium text-admin-text-primary tracking-tight">
          {title}
          <span className="text-admin-accent">.</span>
        </h1>
        {description && (
          <p className="font-body text-base text-admin-text-secondary mt-2 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  )
}
