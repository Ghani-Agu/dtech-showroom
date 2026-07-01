import 'server-only'

/**
 * Maps the real catalogue (the same queries the classic design uses) into the
 * Brand skin's view types. Shared by the Brand homepage, catalog and product
 * pages so the mapping lives in one place.
 */

import { imgOr } from '@/lib/img'
import type { getAllProducts, getAllCategories, getAllBrands } from '@/server/queries'
import type { HeroConfig } from '@/components/home/hero-config'
import type {
  BrandProduct,
  BrandCategory,
  BrandBrandItem,
  BrandData,
} from '@/components/brand/brand-types'

type ProductsRaw = Awaited<ReturnType<typeof getAllProducts>>
type CategoriesRaw = Awaited<ReturnType<typeof getAllCategories>>
type BrandsRaw = Awaited<ReturnType<typeof getAllBrands>>

/** Category slug → GridCatIcon kind. */
const CATEGORY_ICON: Record<string, string> = {
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
  ups: 'parts',
  networking: 'network',
  gaming: 'gaming',
  'power-banks': 'phone',
}

export function toBrandProducts(raw: ProductsRaw): BrandProduct[] {
  return raw.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    cat: p.category.slug,
    catName: p.category.name,
    spec: p.cardSpec ?? '',
    img: imgOr(p.cardImagePath),
    specs: p.specs,
    featured: p.featured,
  }))
}

function counts(raw: ProductsRaw) {
  const byCat = new Map<string, number>()
  const byBrand = new Map<string, number>()
  for (const p of raw) {
    byCat.set(p.category.slug, (byCat.get(p.category.slug) ?? 0) + 1)
    byBrand.set(p.brand.slug, (byBrand.get(p.brand.slug) ?? 0) + 1)
  }
  return { byCat, byBrand }
}

export function toBrandCategories(raw: CategoriesRaw, products: ProductsRaw): BrandCategory[] {
  const { byCat } = counts(products)
  return raw.map((c) => ({
    id: c.slug,
    name: c.name,
    count: byCat.get(c.slug) ?? 0,
    icon: CATEGORY_ICON[c.slug] ?? 'parts',
  }))
}

export function toBrandBrands(raw: BrandsRaw, products: ProductsRaw): BrandBrandItem[] {
  const { byBrand } = counts(products)
  return raw.map((b) => ({
    id: b.slug,
    name: b.name,
    count: byBrand.get(b.slug) ?? 0,
  }))
}

export function buildBrandData(
  products: ProductsRaw,
  categories: CategoriesRaw,
  brands: BrandsRaw,
  hero: HeroConfig | null
): BrandData {
  return {
    products: toBrandProducts(products),
    categories: toBrandCategories(categories, products),
    brands: toBrandBrands(brands, products),
    heroImages: (hero?.slides ?? []).map((s) => s.src).filter(Boolean),
  }
}
