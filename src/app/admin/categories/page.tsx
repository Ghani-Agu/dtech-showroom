import type { Metadata } from 'next'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import {
  and,
  asc,
  count,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
} from 'drizzle-orm'
import { FolderOpen, Plus } from 'lucide-react'
import {
  Button,
  EmptyState,
  FilterSelect,
  PageHeader,
  Pill,
  SearchInput,
} from '@/components/admin-v2/ui'
import { db } from '@/db/client'
import { categories, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Categories · Dtech Admin',
  robots: { index: false, follow: false },
}

type StateFilter = 'active' | 'archived' | 'all'

interface PageProps {
  searchParams: Promise<{ state?: StateFilter; q?: string }>
}

function validateState(s?: string): StateFilter {
  return s === 'archived' || s === 'all' ? s : 'active'
}

export default async function CategoriesListPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)
  const query = params.q ?? ''

  const conditions: SQL[] = []
  if (state === 'active') conditions.push(isNull(categories.archivedAt))
  if (state === 'archived') conditions.push(isNotNull(categories.archivedAt))
  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    const fieldMatch = or(
      ilike(categories.name, pattern),
      ilike(categories.slug, pattern),
      ilike(categories.nameFr, pattern)
    )
    if (fieldMatch) conditions.push(fieldMatch)
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      nameFr: categories.nameFr,
      sortOrder: categories.sortOrder,
      archivedAt: categories.archivedAt,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(whereClause)
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description={`${rows.length} ${rows.length === 1 ? 'category' : 'categories'} in your catalog.`}
        action={
          <Link href="/admin/categories/new">
            <Button variant="primary">
              <Plus size={14} />
              Add category
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput paramName="q" placeholder="Search category name..." />
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
            icon={FolderOpen}
            title={
              state !== 'all'
                ? `No ${state} categories.`
                : 'No categories yet.'
            }
            description="Categories group products by intent."
            action={{
              label: 'Add category',
              href: '/admin/categories/new',
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((category) => {
            const hasFr =
              category.nameFr !== null && category.nameFr.length > 0
            const isArchived = category.archivedAt !== null
            return (
              <Link
                key={category.id}
                href={`/admin/categories/${category.id}/edit`}
                className="group bg-admin-surface-raised border border-admin-border rounded-2xl p-5 hover:bg-admin-surface-elevated hover:border-admin-border-strong transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="size-12 rounded-xl bg-admin-info-soft text-admin-info flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={20} strokeWidth={1.75} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isArchived && <Pill variant="warning">Archived</Pill>}
                    {!hasFr && <Pill variant="info">EN only</Pill>}
                  </div>
                </div>
                <p className="font-display text-lg font-medium text-admin-text-primary tracking-tight">
                  {category.name}
                </p>
                <p className="font-mono text-xs text-admin-text-muted mt-1">
                  /{category.slug}
                </p>
                <div className="mt-4 pt-4 border-t border-admin-border flex items-baseline justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-admin-text-muted">
                    Products
                  </span>
                  <span className="font-display text-2xl font-medium text-admin-text-primary">
                    {category.productCount}
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
