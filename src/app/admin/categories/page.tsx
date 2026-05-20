import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, isNotNull, isNull } from 'drizzle-orm'
import { FolderOpen, Plus } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Card } from '@/components/admin/ui/Card'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { db } from '@/db/client'
import { categories } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Categories — Dtech Admin',
  robots: { index: false, follow: false },
}

type StateFilter = 'active' | 'archived' | 'all'

interface PageProps {
  searchParams: Promise<{ state?: StateFilter }>
}

function validateState(s?: string): StateFilter {
  return s === 'archived' || s === 'all' ? s : 'active'
}

export default async function CategoriesListPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)

  const whereClause =
    state === 'active'
      ? isNull(categories.archivedAt)
      : state === 'archived'
        ? isNotNull(categories.archivedAt)
        : undefined

  const rows = await db
    .select()
    .from(categories)
    .where(whereClause)
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Categories
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            Categories<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/categories/new">
          <Button variant="primary">
            <Plus size={16} />
            New category
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {(['active', 'archived', 'all'] as const).map((s) => {
          const isActive = state === s
          const href =
            s === 'active'
              ? '/admin/categories'
              : `/admin/categories?state=${s}`
          return (
            <Link
              key={s}
              href={href}
              className={
                isActive
                  ? 'inline-flex items-center rounded-full bg-surface-overlay px-2.5 py-1 font-body text-xs font-medium text-text-primary'
                  : 'inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs text-text-secondary transition-colors hover:text-text-primary'
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title={
              state !== 'all'
                ? `No ${state} categories.`
                : 'No categories yet.'
            }
            description={
              state === 'all'
                ? 'Categories group products by intent. Add the first one to get started.'
                : 'Try a different filter or add a new category.'
            }
            action={
              state === 'all'
                ? {
                    label: 'Add the first category',
                    href: '/admin/categories/new',
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((category) => {
              const hasFr =
                category.nameFr !== null && category.nameFr.length > 0
              const isArchived = category.archivedAt !== null
              return (
                <li key={category.id}>
                  <Link
                    href={`/admin/categories/${category.id}/edit`}
                    className={
                      isArchived
                        ? 'block px-6 py-4 opacity-60 transition-colors hover:bg-surface-overlay/40'
                        : 'block px-6 py-4 transition-colors hover:bg-surface-overlay/40'
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-body text-base font-medium text-text-primary">
                            {category.name}
                          </p>
                          {!hasFr && (
                            <Badge variant="warning">EN only</Badge>
                          )}
                          {isArchived && (
                            <Badge variant="neutral">Archived</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate font-body text-sm text-text-secondary">
                          /{category.slug}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-mono text-xs text-text-muted">
                          Sort
                        </p>
                        <p className="font-mono text-sm text-text-secondary">
                          {category.sortOrder}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
