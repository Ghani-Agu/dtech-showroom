'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const labelMap: Record<string, string> = {
  admin: 'Admin',
  inquiries: 'Inquiries',
  products: 'Products',
  brands: 'Brands',
  categories: 'Categories',
  users: 'Users',
  new: 'New',
  edit: 'Edit',
}

function formatSegment(segment: string): string {
  return labelMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }))

  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-surface-overlay px-8 py-3"
    >
      <ol className="flex items-center gap-2 font-body text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight size={14} className="text-text-muted" />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-text-primary">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
