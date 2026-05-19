import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
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
import { Package, Plus, Upload } from 'lucide-react'
import {
  Button,
  PageHeader,
  SearchInput,
  FilterSelect,
  DataTable,
  Pill,
  EmptyState,
} from '@/components/admin-v2/ui'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Products · Dtech Admin',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 25

type FilterState = 'active' | 'archived' | 'all'
type TierFilter = 'all' | 'hero' | 'featured' | 'longtail'

interface PageProps {
  searchParams: Promise<{
    state?: FilterState
    tier?: TierFilter
    brand?: string
    category?: string
    q?: string
    page?: string
  }>
}

function validateState(s?: string): FilterState {
  return s === 'archived' || s === 'all' ? s : 'active'
}

function validateTier(t?: string): TierFilter {
  return t === 'hero' || t === 'featured' || t === 'longtail' ? t : 'all'
}

async function getProducts(
  state: FilterState,
  tier: TierFilter,
  brandSlug: string,
  categorySlug: string,
  query: string,
  page: number
) {
  const offset = (page - 1) * PAGE_SIZE

  const conditions: SQL[] = []

  if (state === 'active') conditions.push(isNull(products.archivedAt))
  if (state === 'archived') conditions.push(isNotNull(products.archivedAt))

  if (tier !== 'all') conditions.push(eq(products.tier, tier))

  if (brandSlug) {
    const brand = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, brandSlug))
      .limit(1)
      .then((rows) => rows[0])

    if (brand) conditions.push(eq(products.brandId, brand.id))
  }

  if (categorySlug) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1)
      .then((rows) => rows[0])

    if (category) conditions.push(eq(products.categoryId, category.id))
  }

  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    const match = or(
      ilike(products.name, pattern),
      ilike(products.slug, pattern),
      ilike(products.tagline, pattern),
      ilike(products.searchKeywords, pattern),
      ilike(products.nameFr, pattern)
    )
    if (match) conditions.push(match)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        nameFr: products.nameFr,
        tier: products.tier,
        featured: products.featured,
        sortOrder: products.sortOrder,
        cardImagePath: products.cardImagePath,
        archivedAt: products.archivedAt,
        updatedAt: products.updatedAt,
        brandName: brands.name,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(asc(products.sortOrder), asc(products.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(products).where(whereClause),
  ])

  return {
    rows,
    total: totalRow[0]?.count ?? 0,
  }
}

async function getFilterOptions() {
  const [brandList, categoryList] = await Promise.all([
    db
      .select({ slug: brands.slug, name: brands.name })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
  ])

  return { brands: brandList, categories: categoryList }
}

function buildHref(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value)
  }
  const str = sp.toString()
  return '/admin/products' + (str ? `?${str}` : '')
}

type ProductRow = Awaited<ReturnType<typeof getProducts>>['rows'][number]

const TIER_LABEL: Record<ProductRow['tier'], string> = {
  hero: 'Hero',
  featured: 'Featured',
  longtail: 'Long-tail',
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diff < day) return 'today'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w`
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo`
  return `${Math.floor(diff / (365 * day))}y`
}

export default async function ProductsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)
  const tier = validateTier(params.tier)
  const brandSlug = params.brand ?? ''
  const categorySlug = params.category ?? ''
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const [{ rows, total }, filterOptions] = await Promise.all([
    getProducts(state, tier, brandSlug, categorySlug, query, page),
    getFilterOptions(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${total} ${total === 1 ? 'product' : 'products'} in your catalog.`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/products/import">
              <Button variant="secondary">
                <Upload size={14} />
                Import
              </Button>
            </Link>
            <Link href="/admin/products/new">
              <Button variant="primary">
                <Plus size={14} />
                Add product
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          paramName="q"
          placeholder="Search name, slug, keywords..."
        />
        <FilterSelect
          paramName="brand"
          label="Brand"
          options={filterOptions.brands.map((b) => ({
            value: b.slug,
            label: b.name,
          }))}
        />
        <FilterSelect
          paramName="category"
          label="Category"
          options={filterOptions.categories.map((c) => ({
            value: c.slug,
            label: c.name,
          }))}
        />
        <FilterSelect
          paramName="tier"
          label="Tier"
          options={[
            { value: 'hero', label: 'Hero' },
            { value: 'featured', label: 'Featured' },
            { value: 'longtail', label: 'Long-tail' },
          ]}
        />
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
            icon={Package}
            title="No products match"
            description="Adjust the filters above, or add a new product to your catalog."
            action={{ label: 'Add product', href: '/admin/products/new' }}
          />
        </div>
      ) : (
        <DataTable<ProductRow>
          rows={rows}
          rowKey={(p) => p.id}
          rowHref={(p) => `/admin/products/${p.id}/edit`}
          columns={[
            {
              key: 'image',
              header: '',
              width: '60px',
              render: (p) => (
                <div className="size-10 rounded-lg bg-admin-surface-elevated overflow-hidden flex-shrink-0">
                  {p.cardImagePath && (
                    <Image
                      src={p.cardImagePath}
                      alt=""
                      width={40}
                      height={40}
                      className="size-full object-cover"
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'name',
              header: 'Name',
              render: (p) => (
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-admin-text-primary truncate">
                    {p.name}
                  </p>
                  <p className="font-mono text-xs text-admin-text-muted mt-0.5 truncate">
                    /{p.slug}
                  </p>
                </div>
              ),
            },
            {
              key: 'brand',
              header: 'Brand',
              render: (p) => (
                <span className="font-body text-sm text-admin-text-secondary">
                  {p.brandName ?? '—'}
                </span>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              render: (p) => (
                <span className="font-body text-sm text-admin-text-secondary">
                  {p.categoryName ?? '—'}
                </span>
              ),
            },
            {
              key: 'tier',
              header: 'Tier',
              render: (p) => (
                <Pill
                  variant={
                    p.tier === 'hero'
                      ? 'accent'
                      : p.tier === 'featured'
                        ? 'info'
                        : 'default'
                  }
                  withDot={false}
                >
                  {TIER_LABEL[p.tier]}
                </Pill>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (p) => (
                <div className="flex flex-wrap gap-1.5">
                  {p.archivedAt ? (
                    <Pill variant="warning" withDot>
                      Archived
                    </Pill>
                  ) : (
                    <Pill variant="success" withDot>
                      Active
                    </Pill>
                  )}
                  {p.featured && (
                    <Pill variant="accent" withDot={false}>
                      Featured
                    </Pill>
                  )}
                </div>
              ),
            },
            {
              key: 'updated',
              header: 'Updated',
              align: 'right',
              render: (p) => (
                <span className="font-mono text-xs text-admin-text-muted">
                  {timeAgo(new Date(p.updatedAt))}
                </span>
              ),
            },
          ]}
        />
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between pt-2"
        >
          <p className="font-body text-sm text-admin-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                  page: String(page - 1),
                })}
                className="font-body text-sm text-admin-text-secondary transition-colors hover:text-admin-text-primary"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-admin-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                  page: String(page + 1),
                })}
                className="font-body text-sm text-admin-text-secondary transition-colors hover:text-admin-text-primary"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
