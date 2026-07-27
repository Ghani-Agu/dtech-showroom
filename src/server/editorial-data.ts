import 'server-only'

/**
 * Maps the real catalogue into the Éditorial skin's view types. The design
 * ("D-Tech - Éditorial") presents categories as large editorial cards, an
 * accordion of ranges, a brand marquee and counters — this module feeds all
 * of that from the same queries every other skin uses.
 *
 * The DB has NO price column (deliberate — see round-9 notes), so everywhere
 * the design shows "À partir de X DA" the port uses the design's own
 * fallback: « Sur devis ».
 */

import { imgOr } from '@/lib/img'
import type { getAllProducts, getAllCategories, getAllBrands } from '@/server/queries'
import type { HeroConfig } from '@/components/home/hero-config'

type ProductsRaw = Awaited<ReturnType<typeof getAllProducts>>
type CategoriesRaw = Awaited<ReturnType<typeof getAllCategories>>
type BrandsRaw = Awaited<ReturnType<typeof getAllBrands>>

import type { EdCat, EdBrandItem, EdData, EdBento, EdBentoProd } from '@/components/editorial/editorial-types'
export type { EdCat, EdBrandItem, EdData }

/** Real category slug → design EDPATH icon. */
const ICON_OF: Record<string, string> = {
  laptops: 'laptop',
  desktops: 'desktop',
  'all-in-one': 'aio',
  monitors: 'desktop',
  tablets: 'tablet',
  printers: 'print',
  scanners: 'print',
  projectors: 'print',
  consumables: 'print',
  storage: 'parts',
  motherboards: 'parts',
  'graphics-cards': 'gaming',
  processors: 'parts',
  'power-supplies': 'parts',
  'pc-cases': 'parts',
  cooling: 'parts',
  ups: 'bolt',
  networking: 'network',
  gaming: 'gaming',
  'power-banks': 'phone',
}

export function buildEditorialData(
  products: ProductsRaw,
  categories: CategoriesRaw,
  brands: BrandsRaw,
  hero: HeroConfig | null
): EdData {
  const countByCat = new Map<string, number>()
  const countByBrand = new Map<string, number>()
  const topsByCat = new Map<string, string[]>()
  for (const p of products) {
    countByCat.set(p.category.slug, (countByCat.get(p.category.slug) ?? 0) + 1)
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
    const tops = topsByCat.get(p.category.slug) ?? []
    if (tops.length < 5) {
      tops.push(p.name)
      topsByCat.set(p.category.slug, tops)
    }
  }

  const cats: EdCat[] = categories
    .map((c) => ({
      id: c.slug,
      name: c.name,
      desc: c.description ?? '',
      img: c.heroImagePath ? imgOr(c.heroImagePath) : null,
      count: countByCat.get(c.slug) ?? 0,
      icon: ICON_OF[c.slug] ?? 'parts',
      tops: topsByCat.get(c.slug) ?? [],
    }))
    .filter((c) => c.count > 0)

  const brandItems: EdBrandItem[] = brands
    .map((b) => ({ id: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
    .filter((b) => b.count > 0)

  return {
    cats,
    brands: brandItems,
    productCount: products.length,
    brandCount: brandItems.length,
    heroImage: hero?.slides?.[0]?.src || null,
    bento: buildBento(products),
  }
}

/**
 * Real catalogue material for the bento's proof artifacts — actual product
 * photos on the test-bench shelf / SAV card, actual model names on the quote
 * document. One representative per category so the spread reads like the
 * real shop, not a mood board.
 */
function buildBento(products: ProductsRaw): EdBento {
  const firstOf = (slugs: string[]): EdBentoProd | null => {
    for (const s of slugs) {
      const p = products.find((x) => x.category.slug === s && x.cardImagePath)
      if (p) return { img: imgOr(p.cardImagePath), name: p.name, cat: p.category.name }
    }
    return null
  }
  const shelf = [
    firstOf(['laptops', 'desktops', 'all-in-one']),
    firstOf(['monitors', 'networking', 'ups']),
    firstOf(['printers', 'scanners', 'consumables']),
  ].filter((x): x is EdBentoProd => x !== null)
  // Backfill from anywhere so the shelf never renders short.
  for (const p of products) {
    if (shelf.length >= 3) break
    if (!p.cardImagePath) continue
    if (shelf.some((s) => s.name === p.name)) continue
    shelf.push({ img: imgOr(p.cardImagePath), name: p.name, cat: p.category.name })
  }
  const sav = firstOf(['laptops', 'desktops', 'printers']) ?? shelf[0] ?? null
  const invoice = [
    firstOf(['laptops', 'desktops']),
    firstOf(['printers', 'consumables', 'scanners']),
    firstOf(['ups', 'networking', 'storage']),
  ]
    .filter((x): x is EdBentoProd => x !== null)
    .map((x) => ({ name: x.name, cat: x.cat }))
  return { shelf: shelf.slice(0, 3), sav, invoice }
}
