import 'server-only'

import { imgOr } from '@/lib/img'
import type { getAllProducts, getAllBrands } from '@/server/queries'
import type { PartnerIconKind, PartnerTile } from '@/components/home/PartnerBand'

/**
 * Data for the homepage partner spotlight.
 *
 * The tiles are DERIVED from the live catalogue — the featured brand's biggest
 * product families, with real counts — rather than hand-written. That means a
 * tile can never advertise a family the brand no longer stocks, and can never
 * link to an empty filtered page. Reseeding or archiving products updates the
 * band on the next request.
 */

type ProductsRaw = Awaited<ReturnType<typeof getAllProducts>>
type BrandsRaw = Awaited<ReturnType<typeof getAllBrands>>

/** Featured partner. Change the slug here to spotlight a different brand. */
export const PARTNER_BRAND_SLUG = 'hp'

/** Partner brand colours — HP's blue, matching their own identity. */
const PARTNER_COLORS: Record<string, { accent: string; deep: string }> = {
  hp: { accent: '#3d92d9', deep: '#0b6bb5' },
  asus: { accent: '#3b4a8c', deep: '#1d2555' },
  dell: { accent: '#1a7fd4', deep: '#0f4c8a' },
  epson: { accent: '#2b4ea2', deep: '#16306b' },
  lenovo: { accent: '#d6373b', deep: '#8f1f22' },
  'tp-link': { accent: '#3aa0d8', deep: '#16688f' },
  canon: { accent: '#cf2027', deep: '#8b1216' },
}
const DEFAULT_COLORS = { accent: '#3d92d9', deep: '#0b6bb5' }

const CATEGORY_ICON: Record<string, PartnerIconKind> = {
  laptops: 'laptop',
  monitors: 'monitor',
  'all-in-one': 'aio',
  desktops: 'desktop',
  printers: 'printer',
  scanners: 'printer',
  projectors: 'printer',
  consumables: 'printer',
  networking: 'network',
  gaming: 'gaming',
  'graphics-cards': 'gaming',
  tablets: 'laptop',
}

export interface PartnerBandData {
  brandSlug: string
  brandName: string
  logoPath: string | null
  accent: string
  accentDeep: string
  productCount: number
  tiles: PartnerTile[]
}

export function buildPartnerBand(
  products: ProductsRaw,
  brands: BrandsRaw,
  brandSlug: string = PARTNER_BRAND_SLUG,
  /** How many family tiles to show. The layout is a 2×2 grid. */
  tileCount = 4
): PartnerBandData | null {
  const brand = brands.find((b) => b.slug === brandSlug)
  if (!brand) return null

  const mine = products.filter((p) => p.brand.slug === brandSlug)
  if (mine.length === 0) return null

  // Group into categories, then take the biggest families.
  const byCategory = new Map<string, { name: string; count: number }>()
  for (const p of mine) {
    const slug = p.category.slug
    const entry = byCategory.get(slug)
    if (entry) entry.count++
    else byCategory.set(slug, { name: p.category.name, count: 1 })
  }

  const tiles: PartnerTile[] = [...byCategory.entries()]
    .sort(
      // Count desc, then slug asc so the order is stable across requests and
      // locales — an unstable tie-break would reshuffle the grid on refresh.
      (a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])
    )
    .slice(0, tileCount)
    .map(([slug, { name, count }]) => ({
      categorySlug: slug,
      title: `${brand.name} ${name}`,
      // Filled in by the caller, which has the translator.
      sub: String(count),
      icon: CATEGORY_ICON[slug] ?? 'parts',
    }))

  const colors = PARTNER_COLORS[brandSlug] ?? DEFAULT_COLORS

  return {
    brandSlug,
    brandName: brand.name,
    logoPath: brand.logoPath ? imgOr(brand.logoPath) : null,
    accent: colors.accent,
    accentDeep: colors.deep,
    productCount: mine.length,
    tiles,
  }
}
