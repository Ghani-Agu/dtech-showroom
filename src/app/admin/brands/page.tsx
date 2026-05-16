import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { asc, isNotNull, isNull } from 'drizzle-orm'
import { Plus, Tag } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Card } from '@/components/admin/ui/Card'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { db } from '@/db/client'
import { brands } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Brands — Dtech Admin',
  robots: { index: false, follow: false },
}

type StateFilter = 'active' | 'archived' | 'all'

interface PageProps {
  searchParams: Promise<{ state?: StateFilter }>
}

function validateState(s?: string): StateFilter {
  return s === 'archived' || s === 'all' ? s : 'active'
}

export default async function BrandsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)

  const whereClause =
    state === 'active'
      ? isNull(brands.archivedAt)
      : state === 'archived'
        ? isNotNull(brands.archivedAt)
        : undefined

  const rows = await db
    .select()
    .from(brands)
    .where(whereClause)
    .orderBy(asc(brands.sortOrder), asc(brands.name))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Brands
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            Brands<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/brands/new">
          <Button variant="primary">
            <Plus size={16} />
            New brand
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {(['active', 'archived', 'all'] as const).map((s) => {
          const isActive = state === s
          const href =
            s === 'active' ? '/admin/brands' : `/admin/brands?state=${s}`
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
            icon={Tag}
            title={
              state !== 'all' ? `No ${state} brands.` : 'No brands yet.'
            }
            description={
              state === 'all'
                ? 'Brands organize products by manufacturer. Add the first one to get started.'
                : 'Try a different filter or add a new brand.'
            }
            action={
              state === 'all'
                ? { label: 'Add the first brand', href: '/admin/brands/new' }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((brand) => {
              const hasFr =
                brand.nameFr !== null && brand.nameFr.length > 0
              const isArchived = brand.archivedAt !== null
              return (
                <li key={brand.id}>
                  <Link
                    href={`/admin/brands/${brand.id}/edit`}
                    className={
                      isArchived
                        ? 'block px-6 py-4 opacity-60 transition-colors hover:bg-surface-overlay/40'
                        : 'block px-6 py-4 transition-colors hover:bg-surface-overlay/40'
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-elevated">
                        {brand.logoPath ? (
                          <Image
                            src={brand.logoPath}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <span className="font-mono text-xs text-text-muted">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-body text-base font-medium text-text-primary">
                            {brand.name}
                          </p>
                          {!hasFr && (
                            <Badge variant="warning">EN only</Badge>
                          )}
                          {isArchived && (
                            <Badge variant="neutral">Archived</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate font-body text-sm text-text-secondary">
                          /{brand.slug}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-mono text-xs text-text-muted">
                          Sort
                        </p>
                        <p className="font-mono text-sm text-text-secondary">
                          {brand.sortOrder}
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
