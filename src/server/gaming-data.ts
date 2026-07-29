import 'server-only'

import { imgOr } from '@/lib/img'
import type { getAllProducts } from '@/server/queries'
import {
  GAMING_BRANDS,
  GAMING_BUILD_ORDER,
  isGamingProduct,
} from '@/components/editorial/ed-families'
import type { BrandProduct } from '@/components/brand/brand-types'

type ProductsRaw = Awaited<ReturnType<typeof getAllProducts>>

/**
 * ROUND 19 (phase C) — the Gaming page's payload.
 *
 * Everything is derived from the SAME catalogue as the rest of the site; the
 * page has no separate data source and no hand-maintained product list, so a
 * new GPU added in the admin shows up here the moment it is categorised.
 * The classification lives in `ed-families.ts` — see the note there about
 * why `monitors` and `storage` are conditional rather than core.
 */

export interface EdGamingCollection {
  /** i18n key suffix: `gm.col.<id>` / `gm.col.<id>.d`. */
  id: 'build' | 'screens' | 'gear'
  products: BrandProduct[]
}

export interface EdGamingStep {
  slug: string
  count: number
  img: string | null
}

export interface EdGamingData {
  total: number
  /**
   * Size of the `gaming` CATEGORY alone — i.e. what `/products?category=gaming`
   * actually returns. Kept separate from `total` because no facet on
   * /products can express "everything gaming", so a CTA pointing there must
   * quote this number or it promises 120 and delivers 11.
   */
  gearCount: number
  /** Gaming-oriented brands present in the catalogue, biggest first. */
  brands: { slug: string; name: string; count: number }[]
  /** The rig build path, in assembly order, only steps we actually stock. */
  steps: EdGamingStep[]
  collections: EdGamingCollection[]
  /** Hero showcase — a few gaming products that have an image. */
  showcase: BrandProduct[]
}

/**
 * Round-robin across categories, so a capped list stays representative.
 *
 * Sorting by build order and slicing produced a strict PREFIX — 7 processors
 * then 5 motherboards filled all 12 slots, and the "build" collection showed
 * no graphics card, case or PSU at all. Taking one per category per pass
 * keeps the build order readable while guaranteeing every step is visible.
 */
function roundRobin<T>(items: T[], keyOf: (item: T) => string, limit: number): T[] {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const k = keyOf(item)
    const b = buckets.get(k)
    if (b) b.push(item)
    else buckets.set(k, [item])
  }
  const out: T[] = []
  let round = 0
  while (out.length < limit) {
    let added = false
    for (const b of buckets.values()) {
      const item = b[round]
      if (item === undefined) continue
      out.push(item)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
    round += 1
  }
  return out
}

function toCard(p: ProductsRaw[number]): BrandProduct {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    cat: p.category.slug,
    catName: p.category.name,
    spec: p.cardSpec ?? '',
    img: imgOr(p.cardImagePath),
    specs: p.specs,
    featured: p.featured,
  }
}

export function buildGamingData(products: ProductsRaw): EdGamingData {
  const gaming = products.filter((p) =>
    isGamingProduct({
      name: p.name,
      brandSlug: p.brand.slug,
      categorySlug: p.category.slug,
    })
  )

  const byBrand = new Map<string, { slug: string; name: string; count: number }>()
  for (const p of gaming) {
    const hit = byBrand.get(p.brand.slug)
    if (hit) hit.count += 1
    else byBrand.set(p.brand.slug, { slug: p.brand.slug, name: p.brand.name, count: 1 })
  }
  const brands = [...byBrand.values()].sort(
    (a, b) =>
      // Dedicated gaming brands first, then by catalogue weight — otherwise
      // ASUS's 71 refs bury GameMax and Game Revolution, which are the ones
      // that exist only for this page.
      Number((GAMING_BRANDS as readonly string[]).includes(b.slug)) -
        Number((GAMING_BRANDS as readonly string[]).includes(a.slug)) || b.count - a.count
  )

  const countByCat = new Map<string, number>()
  const imgByCat = new Map<string, string | null>()
  for (const p of gaming) {
    countByCat.set(p.category.slug, (countByCat.get(p.category.slug) ?? 0) + 1)
    if (!imgByCat.has(p.category.slug)) {
      imgByCat.set(p.category.slug, p.category.heroImagePath ?? null)
    }
  }

  const steps: EdGamingStep[] = GAMING_BUILD_ORDER.map((slug) => ({
    slug,
    count: countByCat.get(slug) ?? 0,
    img: imgByCat.get(slug) ?? null,
  })).filter((s) => s.count > 0)

  const buildSlugs = new Set<string>(GAMING_BUILD_ORDER)

  /* Three collections instead of invented price tiers.
     The catalogue has NO price column (deliberate, see editorial-data.ts), so
     a "Starter / Performance / Extreme" ladder would be fabricated. Splitting
     by what you are actually shopping for is both honest and more useful. */
  const collections: EdGamingCollection[] = ([
    {
      id: 'build' as const,
      products: roundRobin(
        gaming
          .filter((p) => buildSlugs.has(p.category.slug))
          .sort(
            (a, b) =>
              GAMING_BUILD_ORDER.indexOf(a.category.slug as (typeof GAMING_BUILD_ORDER)[number]) -
                GAMING_BUILD_ORDER.indexOf(
                  b.category.slug as (typeof GAMING_BUILD_ORDER)[number]
                ) ||
              Number(b.featured) - Number(a.featured) ||
              a.sortOrder - b.sortOrder
          ),
        (p) => p.category.slug,
        12
      ).map(toCard),
    },
    {
      id: 'screens' as const,
      products: gaming
        .filter((p) => p.category.slug === 'monitors')
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder)
        .slice(0, 12)
        .map(toCard),
    },
    {
      id: 'gear' as const,
      products: gaming
        .filter((p) => p.category.slug === 'gaming')
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder)
        .slice(0, 12)
        .map(toCard),
    },
  ] satisfies EdGamingCollection[]).filter((c) => c.products.length > 0)

  return {
    total: gaming.length,
    gearCount: gaming.filter((p) => p.category.slug === 'gaming').length,
    brands,
    steps,
    collections,
    showcase: gaming
      .filter((p) => p.cardImagePath)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder)
      .slice(0, 6)
      .map(toCard),
  }
}
