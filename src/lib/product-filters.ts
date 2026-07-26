/**
 * product-filters.ts — URL ⇄ filter state for the catalogue page.
 *
 * Everything runs on the SERVER: the page reads searchParams, filters the
 * (already memory-cached) catalogue, and ships only the current page of
 * products to the browser. Two things follow from that:
 *
 *  - filter state lives in the URL, so a filtered view is shareable,
 *    bookmarkable, survives back-navigation and is crawlable;
 *  - the client payload is one page of cards, not all 393 rows.
 *
 * Pure module — no React, no server-only imports — so route handlers,
 * `generateMetadata` and components can all share it.
 */

import type { ExplorerProduct, FacetOption } from '@/types/catalog'

export const PRODUCTS_PER_PAGE = 24

export const SORTS = ['featured', 'az', 'za', 'newest'] as const
export type SortKey = (typeof SORTS)[number]

export interface ProductQuery {
  category: string | null
  brand: string | null
  q: string
  sort: SortKey
  page: number
  /** Only products flagged featured. */
  featuredOnly: boolean
}

export type RawSearchParams = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

export function parseProductQuery(sp: RawSearchParams): ProductQuery {
  const rawSort = one(sp.sort)
  const rawPage = Number.parseInt(one(sp.page), 10)
  return {
    category: one(sp.category).trim() || null,
    brand: one(sp.brand).trim() || null,
    q: one(sp.q).trim().slice(0, 80),
    sort: (SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as SortKey)
      : 'featured',
    // Capped: an uncapped value ends up in the canonical URL (`page=1e%2B23`)
    // and in the <title>. 1000 pages is far beyond any real catalogue.
    page:
      Number.isFinite(rawPage) && rawPage > 1 ? Math.min(rawPage, 1000) : 1,
    featuredOnly: one(sp.featured) === '1',
  }
}

/** Serialise back to a query string, omitting defaults so URLs stay clean. */
export function productQueryToSearch(
  q: Partial<ProductQuery>,
  overrides: Partial<ProductQuery> = {}
): string {
  const m = { ...q, ...overrides }
  const sp = new URLSearchParams()
  if (m.category) sp.set('category', m.category)
  if (m.brand) sp.set('brand', m.brand)
  if (m.q) sp.set('q', m.q)
  if (m.sort && m.sort !== 'featured') sp.set('sort', m.sort)
  if (m.featuredOnly) sp.set('featured', '1')
  if (m.page && m.page > 1) sp.set('page', String(m.page))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/** True when the query narrows the catalogue at all. */
export function hasActiveFilters(q: ProductQuery): boolean {
  return Boolean(q.category || q.brand || q.q || q.featuredOnly)
}

/**
 * A search query produces near-infinite thin pages — canonical those to the
 * clean catalogue and keep them out of the index. Facet combinations ARE
 * worth indexing (they map to real shopper intent).
 */
export function shouldIndex(q: ProductQuery): boolean {
  return q.q.length === 0
}

function matchesText(p: ExplorerProduct, needle: string): boolean {
  if (!needle) return true
  return (
    p.name.toLowerCase().includes(needle) ||
    p.brandName.toLowerCase().includes(needle) ||
    p.categoryName.toLowerCase().includes(needle) ||
    (p.cardSpec ?? '').toLowerCase().includes(needle)
  )
}

export interface ProductQueryResult {
  /** Just this page's products. */
  items: ExplorerProduct[]
  /** Matching count across all pages. */
  total: number
  totalPages: number
  /** Clamped to [1, totalPages]. */
  page: number
  /** 0-based index of the first item on this page (for JSON-LD positions). */
  offset: number
  /** Counts reflect the OTHER active facets, so chips never lead to zero. */
  categories: FacetOption[]
  brands: FacetOption[]
  featuredCount: number
}

function facet(
  rows: ExplorerProduct[],
  key: 'brand' | 'category'
): FacetOption[] {
  const map = new Map<string, FacetOption>()
  for (const p of rows) {
    const slug = key === 'brand' ? p.brandSlug : p.categorySlug
    const name = key === 'brand' ? p.brandName : p.categoryName
    const f = map.get(slug)
    if (f) f.count++
    else map.set(slug, { slug, name, count: 1 })
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
}

/**
 * Apply a query to the catalogue.
 *
 * Facet counts are computed against the set narrowed by every OTHER active
 * facet — the standard e-commerce behaviour. Counting against the fully
 * filtered set would show "0" next to every unselected chip; counting against
 * the unfiltered catalogue would promise more results than a click delivers.
 */
export function runProductQuery(
  all: ExplorerProduct[],
  query: ProductQuery
): ProductQueryResult {
  const needle = query.q.toLowerCase()

  const byText = all.filter((p) => matchesText(p, needle))
  const byFeatured = query.featuredOnly ? byText.filter((p) => p.featured) : byText

  // For the category lane: everything except the category selection.
  const forCategoryFacet = byFeatured.filter(
    (p) => !query.brand || p.brandSlug === query.brand
  )
  // For the brand lane: everything except the brand selection.
  const forBrandFacet = byFeatured.filter(
    (p) => !query.category || p.categorySlug === query.category
  )

  const matched = byFeatured.filter(
    (p) =>
      (!query.category || p.categorySlug === query.category) &&
      (!query.brand || p.brandSlug === query.brand)
  )

  // Same rule as the lanes: count against everything EXCEPT this facet's own
  // selection. Counting against `byText` alone made the chip promise results
  // from other categories that a click could never return.
  const featuredCount = byText.filter(
    (p) =>
      p.featured &&
      (!query.category || p.categorySlug === query.category) &&
      (!query.brand || p.brandSlug === query.brand)
  ).length

  const sorted = [...matched]
  if (query.sort === 'az') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else if (query.sort === 'za') sorted.sort((a, b) => b.name.localeCompare(a.name))
  else if (query.sort === 'newest') {
    // Real recency, from the DB column — an earlier version just reversed the
    // array, which for a catalogue that shares one sortOrder is indistinguishable
    // from the Z–A sort sitting next to it in the same dropdown.
    sorted.sort(
      (a, b) =>
        (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.name.localeCompare(b.name)
    )
  } else {
    sorted.sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)
    )
  }

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE))
  const page = Math.min(Math.max(1, query.page), totalPages)
  const offset = (page - 1) * PRODUCTS_PER_PAGE

  return {
    items: sorted.slice(offset, offset + PRODUCTS_PER_PAGE),
    total,
    totalPages,
    page,
    offset,
    categories: facet(forCategoryFacet, 'category'),
    brands: facet(forBrandFacet, 'brand'),
    featuredCount,
  }
}
