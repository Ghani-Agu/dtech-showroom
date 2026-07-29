import type { MetadataRoute } from 'next'
import { asc, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'
import { locales } from '@/i18n/config'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'

export const revalidate = 3600 // regenerate hourly

// `/search` is intentionally dropped — thin content with no crawlable state
// of its own. `/categories` (and the per-slug category/brand pages) are gone
// too (ROUND 13): they 308 to the faceted catalogue, whose facet URLs are
// listed below instead.
const STATIC_PATHS = [
  '',
  '/catalogue',
  '/products',
  '/brands',
  // Round 19 phase C: these are real pages now, not redirect stubs, so they
  // are indexable and belong here.
  '/gaming',
  '/company',
  '/contact',
  '/about',
  '/legal',
]

function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    locales.map((l) => [l, `${SITE_URL}/${l}${path}`])
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productList: Array<{ slug: string; updatedAt: Date }> = []
  let brandList: Array<{ slug: string; updatedAt: Date }> = []
  let categoryList: Array<{ slug: string; updatedAt: Date }> = []

  try {
    ;[productList, brandList, categoryList] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(isNull(products.archivedAt))
        .orderBy(asc(products.sortOrder)),
      db
        .select({ slug: brands.slug, updatedAt: brands.updatedAt })
        .from(brands)
        .where(isNull(brands.archivedAt)),
      db
        .select({ slug: categories.slug, updatedAt: categories.updatedAt })
        .from(categories)
        .where(isNull(categories.archivedAt)),
    ])
  } catch {
    // DB unavailable at build time — sitemap will be the static-only baseline
  }

  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: path === '' ? 1.0 : 0.7,
        alternates: { languages: languageAlternates(path) },
      })
    }

    // ROUND 19 — /brands/<slug> is a real page again (editorial skin), with
    // brand story, ranges, FAQ and its own JSON-LD. It outranks the bare
    // facet, so it ships at a higher priority; the facet stays listed because
    // it is still what the other two skins serve and what a "HP laptops"
    // style query maps onto.
    for (const brand of brandList) {
      const path = `/brands/${brand.slug}`
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: brand.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: languageAlternates(path) },
      })
      const facet = `/products?brand=${brand.slug}`
      entries.push({
        url: `${SITE_URL}/${locale}${facet}`,
        lastModified: brand.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: { languages: languageAlternates(facet) },
      })
    }

    for (const category of categoryList) {
      const facet = `/products?category=${category.slug}`
      entries.push({
        url: `${SITE_URL}/${locale}${facet}`,
        lastModified: category.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: { languages: languageAlternates(facet) },
      })
    }

    for (const product of productList) {
      const path = `/products/${product.slug}`
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: product.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      })
    }
  }

  return entries
}
