import 'server-only'

import { getAllBrands, getAllCategories, getAllProducts } from './queries'
import { defaultLocale, isValidLocale } from '@/i18n/config'
import type { NavData } from '@/types/nav'

/**
 * ROUND 19 — one compact payload that feeds every chrome surface (the pill
 * nav's Catalogue mega-menu, the footer's category column, the mobile menu).
 *
 * It is built in the [locale] layout ONCE per render and handed to a client
 * context, rather than threaded as props through the eight route files that
 * mount a skin shell. All three source reads are already memoised by
 * `cachedData()` (60 s fresh + last-known-good stale), so this adds no real
 * database traffic on top of what the page bodies fetch anyway — and the
 * projection below keeps the serialized client payload at a few kB instead of
 * shipping 393 product rows.
 *
 * Types + the empty fallback live in `@/types/nav` so the client context can
 * import them without dragging `server-only` into the browser bundle.
 */
export async function getNavData(locale: string): Promise<NavData> {
  const l = isValidLocale(locale) ? locale : defaultLocale
  const [categories, brands, products] = await Promise.all([
    getAllCategories(l),
    getAllBrands(l),
    getAllProducts(l),
  ])

  const byCat = new Map<string, number>()
  const byBrand = new Map<string, number>()
  for (const p of products) {
    byCat.set(p.category.slug, (byCat.get(p.category.slug) ?? 0) + 1)
    byBrand.set(p.brand.slug, (byBrand.get(p.brand.slug) ?? 0) + 1)
  }

  return {
    cats: categories
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        count: byCat.get(c.slug) ?? 0,
        img: c.heroImagePath ?? null,
      }))
      .filter((c) => c.count > 0),
    brands: brands
      .map((b) => ({ slug: b.slug, name: b.name, count: byBrand.get(b.slug) ?? 0 }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count),
    productCount: products.length,
  }
}
