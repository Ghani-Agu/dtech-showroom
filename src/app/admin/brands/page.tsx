import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import { and, asc, count, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm'
import { Plus, Tag } from 'lucide-react'
import {
  Button,
  EmptyState,
  FilterSelect,
  PageHeader,
  Pill,
  SearchInput,
} from '@/components/admin-v2/ui'
import { db } from '@/db/client'
import { brands, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Brands · Dtech Admin',
  robots: { index: false, follow: false },
}

type StateFilter = 'active' | 'archived' | 'all'

interface PageProps {
  searchParams: Promise<{ state?: StateFilter; q?: string }>
}

function validateState(s?: string): StateFilter {
  return s === 'archived' || s === 'all' ? s : 'active'
}

export default async function BrandsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)
  const query = params.q ?? ''

  const conditions: SQL[] = []
  if (state === 'active') conditions.push(isNull(brands.archivedAt))
  if (state === 'archived') conditions.push(isNotNull(brands.archivedAt))
  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    const fieldMatch = or(
      ilike(brands.name, pattern),
      ilike(brands.slug, pattern),
      ilike(brands.nameFr, pattern)
    )
    if (fieldMatch) conditions.push(fieldMatch)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: brands.id,
      slug: brands.slug,
      name: brands.name,
      nameFr: brands.nameFr,
      logoPath: brands.logoPath,
      heroImagePath: brands.heroImagePath,
      sortOrder: brands.sortOrder,
      archivedAt: brands.archivedAt,
      productCount: count(products.id),
    })
    .from(brands)
    .leftJoin(products, eq(products.brandId, brands.id))
    .where(whereClause)
    .groupBy(brands.id)
    .orderBy(asc(brands.sortOrder), asc(brands.name))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description={`${rows.length} ${rows.length === 1 ? 'brand' : 'brands'} in your catalog.`}
        action={
          <Link href="/admin/brands/new">
            <Button variant="primary">
              <Plus size={14} />
              Add brand
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput paramName="q" placeholder="Search brand name..." />
        <FilterSelect
          paramName="state"
          label="State"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
            { value: 'all', label: 'All' },
          ]}
          includeAll={false}
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-admin-surface-raised border border-admin-border rounded-2xl">
          <EmptyState
            icon={Tag}
            title={state !== 'all' ? `No ${state} brands.` : 'No brands yet.'}
            description="Brands organize products by manufacturer."
            action={{
              label: 'Add brand',
              href: '/admin/brands/new',
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((brand) => {
            const hasFr = brand.nameFr !== null && brand.nameFr.length > 0
            const isArchived = brand.archivedAt !== null
            return (
              <Link
                key={brand.id}
                href={`/admin/brands/${brand.id}/edit`}
                className="group bg-admin-surface-raised border border-admin-border rounded-2xl p-5 hover:bg-admin-surface-elevated hover:border-admin-border-strong transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="size-14 rounded-xl bg-admin-surface-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {brand.logoPath ? (
                      <Image
                        src={brand.logoPath}
                        alt=""
                        width={56}
                        height={56}
                        className="size-full object-contain p-2"
                      />
                    ) : (
                      <span className="font-mono text-sm text-admin-text-muted">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isArchived && <Pill variant="warning">Archived</Pill>}
                    {!hasFr && <Pill variant="info">EN only</Pill>}
                  </div>
                </div>
                <p className="font-display text-lg font-medium text-admin-text-primary tracking-tight">
                  {brand.name}
                </p>
                <p className="font-mono text-xs text-admin-text-muted mt-1">
                  /{brand.slug}
                </p>
                <div className="mt-4 pt-4 border-t border-admin-border flex items-baseline justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-admin-text-muted">
                    Products
                  </span>
                  <span className="font-display text-2xl font-medium text-admin-text-primary">
                    {brand.productCount}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
