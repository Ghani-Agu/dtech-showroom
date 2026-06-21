import type { Metadata } from 'next'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import { ImageOff, Languages } from 'lucide-react'
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
import { GlassCard } from '@/components/admin/GlassCard'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { Input } from '@/components/admin/ui/Input'
import { ProductListRow } from '@/components/admin/products/ProductListRow'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Produits · Dtech Admin',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 25

type FilterState = 'active' | 'archived' | 'all'
type TierFilter = 'all' | 'hero' | 'featured' | 'longtail'
type FlagFilter = '' | 'sans-photo' | 'sans-fr'

interface PageProps {
  searchParams: Promise<{
    state?: FilterState
    tier?: TierFilter
    flag?: string
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
  page: number,
  flag: FlagFilter = ''
) {
  const offset = (page - 1) * PAGE_SIZE

  const conditions: SQL[] = []

  if (state === 'active') conditions.push(isNull(products.archivedAt))
  if (state === 'archived') conditions.push(isNotNull(products.archivedAt))

  if (tier !== 'all') conditions.push(eq(products.tier, tier))

  if (flag === 'sans-photo') {
    const cond = or(
      isNull(products.cardImagePath),
      eq(products.cardImagePath, '')
    )
    if (cond) conditions.push(cond)
  }
  if (flag === 'sans-fr') {
    const cond = or(isNull(products.nameFr), eq(products.nameFr, ''))
    if (cond) conditions.push(cond)
  }

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
  const flag: FlagFilter =
    params.flag === 'sans-photo' || params.flag === 'sans-fr'
      ? params.flag
      : ''

  const [{ rows, total }, filterOptions, noPhotoRow, noFrRow] = await Promise.all([
    getProducts(state, tier, brandSlug, categorySlug, query, page, flag),
    getFilterOptions(),
    db
      .select({ n: count() })
      .from(products)
      .where(
        and(
          isNull(products.archivedAt),
          or(isNull(products.cardImagePath), eq(products.cardImagePath, ''))
        )
      ),
    db
      .select({ n: count() })
      .from(products)
      .where(
        and(
          isNull(products.archivedAt),
          or(isNull(products.nameFr), eq(products.nameFr, ''))
        )
      ),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const noPhotoCount = noPhotoRow[0]?.n ?? 0
  const noFrCount = noFrRow[0]?.n ?? 0

  const tierFilters: Array<{ value: TierFilter; label: string }> = [
    { value: 'all', label: 'Toutes les mises en scène' },
    { value: 'hero', label: 'Vitrine' },
    { value: 'featured', label: 'Vedette' },
    { value: 'longtail', label: 'Standard' },
  ]

  const stateFilters: Array<{ value: FilterState; label: string }> = [
    { value: 'active', label: 'En ligne' },
    { value: 'archived', label: 'Masqués' },
    { value: 'all', label: 'Tous' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Produits
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            Catalogue<span className="text-[var(--admin-cyan)]">.</span>
          </h1>
          {/* health shortcuts — click to filter */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={buildHref({ flag: flag === 'sans-photo' ? undefined : 'sans-photo' })}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[12px] font-semibold transition-transform hover:-translate-y-px"
              style={{
                borderColor: flag === 'sans-photo' ? 'var(--c-orange)' : 'color-mix(in oklab, var(--c-orange) 35%, transparent)',
                color: 'var(--c-orange)',
                background: flag === 'sans-photo' ? 'color-mix(in oklab, var(--c-orange) 18%, transparent)' : 'color-mix(in oklab, var(--c-orange) 7%, transparent)',
              }}
            >
              <ImageOff size={12} />
              {noPhotoCount} sans photo
            </Link>
            <Link
              href={buildHref({ flag: flag === 'sans-fr' ? undefined : 'sans-fr' })}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[12px] font-semibold transition-transform hover:-translate-y-px"
              style={{
                borderColor: flag === 'sans-fr' ? 'var(--c-violet)' : 'color-mix(in oklab, var(--c-violet) 35%, transparent)',
                color: 'var(--c-violet)',
                background: flag === 'sans-fr' ? 'color-mix(in oklab, var(--c-violet) 18%, transparent)' : 'color-mix(in oklab, var(--c-violet) 7%, transparent)',
              }}
            >
              <Languages size={12} />
              {noFrCount} sans traduction FR
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/import">
            <Button variant="secondary">
              <Upload size={16} />
              Importer
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button variant="primary">
              <Plus size={16} />
              Nouveau produit
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            État :
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
                    ? 'inline-flex items-center rounded-full bg-[var(--admin-cyan)]/15 border border-cyan-400/30 px-2.5 py-1 font-body text-xs font-medium text-[var(--admin-cyan)]'
                    : 'inline-flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 font-body text-xs text-[var(--admin-text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50'
                }
              >
                {f.label}
              </Link>
            )
          })}

          <span className="ml-4 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Mise en scène :
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
                    ? 'inline-flex items-center rounded-full bg-[var(--admin-cyan)]/15 border border-cyan-400/30 px-2.5 py-1 font-body text-xs font-medium text-[var(--admin-cyan)]'
                    : 'inline-flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 font-body text-xs text-[var(--admin-text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50'
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
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Marque
            </label>
            <select
              name="brand"
              defaultValue={brandSlug}
              className="w-full rounded-md bg-white/[0.03] border border-white/[0.08] px-3 py-2 font-body text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus:border-cyan-400/50"
            >
              <option value="">Toutes les marques</option>
              {filterOptions.brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Catégorie
            </label>
            <select
              name="category"
              defaultValue={categorySlug}
              className="w-full rounded-md bg-white/[0.03] border border-white/[0.08] px-3 py-2 font-body text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus:border-cyan-400/50"
            >
              <option value="">Toutes les catégories</option>
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
              label="Recherche"
              placeholder="Nom, slug, mots-clés…"
              defaultValue={query}
            />
          </div>

          <Button type="submit" variant="secondary">Filtrer</Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Package}
            title="Aucun produit ne correspond aux filtres."
            description="Modifiez les filtres ci-dessus ou ajoutez un produit."
            action={{ label: 'Ajouter un produit', href: '/admin/products/new' }}
          />
        </GlassCard>
      ) : (
        <GlassCard padded={false} className="overflow-hidden">
          <ul>
            {rows.map((p) => (
              <ProductListRow key={p.id} product={p} />
            ))}
          </ul>
        </GlassCard>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <p className="font-body text-sm text-[var(--admin-text-tertiary)]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
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
                className="font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
              >
                Précédent
              </Link>
            )}
            <span className="font-mono text-sm text-[var(--admin-text-tertiary)]">
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
                className="font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
              >
                Suivant
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
