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
import { Package, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { Card } from '@/components/admin/ui/Card'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { Input } from '@/components/admin/ui/Input'
import { ProductListRow } from '@/components/admin/products/ProductListRow'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Products — Dtech Admin',
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

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined

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

function buildHref(params: Partial<Record<string, string>>) {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value)
  }
  const str = sp.toString()
  return '/admin/products' + (str ? `?${str}` : '')
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

  const tierFilters: Array<{ value: TierFilter; label: string }> = [
    { value: 'all', label: 'All tiers' },
    { value: 'hero', label: 'Hero' },
    { value: 'featured', label: 'Featured' },
    { value: 'longtail', label: 'Long-tail' },
  ]

  const stateFilters: Array<{ value: FilterState; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Products
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            Catalog<span className="text-accent">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/import">
            <Button variant="secondary">
              <Upload size={16} />
              Import
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button variant="primary">
              <Plus size={16} />
              New product
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            State:
          </span>
          {stateFilters.map((f) => {
            const isActive = state === f.value
            return (
              <Link
                key={f.value}
                href={buildHref({
                  state: f.value === 'active' ? undefined : f.value,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                })}
                className={
                  isActive
                    ? 'inline-flex items-center rounded-full bg-surface-overlay px-2.5 py-1 font-body text-xs font-medium text-text-primary'
                    : 'inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs text-text-secondary transition-colors hover:text-text-primary'
                }
              >
                {f.label}
              </Link>
            )
          })}

          <span className="ml-4 font-mono text-xs uppercase tracking-wider text-text-muted">
            Tier:
          </span>
          {tierFilters.map((f) => {
            const isActive = tier === f.value
            return (
              <Link
                key={f.value}
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: f.value === 'all' ? undefined : f.value,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                })}
                className={
                  isActive
                    ? 'inline-flex items-center rounded-full bg-surface-overlay px-2.5 py-1 font-body text-xs font-medium text-text-primary'
                    : 'inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs text-text-secondary transition-colors hover:text-text-primary'
                }
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        <form
          action="/admin/products"
          method="GET"
          className="flex flex-wrap items-end gap-3"
        >
          {state !== 'active' && (
            <input type="hidden" name="state" value={state} />
          )}
          {tier !== 'all' && (
            <input type="hidden" name="tier" value={tier} />
          )}

          <div className="min-w-[180px]">
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-muted">
              Brand
            </label>
            <select
              name="brand"
              defaultValue={brandSlug}
              className="w-full rounded-md bg-surface-elevated px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All brands</option>
              {filterOptions.brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-muted">
              Category
            </label>
            <select
              name="category"
              defaultValue={categorySlug}
              className="w-full rounded-md bg-surface-elevated px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[240px] flex-1">
            <Input
              type="search"
              name="q"
              label="Search"
              placeholder="Name, slug, tagline, keywords..."
              defaultValue={query}
            />
          </div>

          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No products match the current filters."
            description="Adjust the filters above, or add a new product."
            action={{ label: 'Add the first product', href: '/admin/products/new' }}
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((p) => (
              <ProductListRow key={p.id} product={p} />
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <p className="font-body text-sm text-text-muted">
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
                className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-text-muted">
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
                className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
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
