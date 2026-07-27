import { imgOr } from '@/lib/img'
import type { ProductWithRelations } from '@/db/schema'
import type {
  ExplorerProduct,
  FacetOption,
} from '@/components/showroom/ProductExplorer'

export function toExplorerProducts(
  products: ProductWithRelations[]
): ExplorerProduct[] {
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    cardSpec: p.cardSpec,
    cardImagePath: imgOr(p.cardImagePath),
    specs: p.specs,
    featured: p.featured,
  }))
}

export function facetFromProducts(
  products: ExplorerProduct[],
  key: 'brand' | 'category'
): FacetOption[] {
  const map = new Map<string, FacetOption>()
  for (const p of products) {
    const slug = key === 'brand' ? p.brandSlug : p.categorySlug
    const name = key === 'brand' ? p.brandName : p.categoryName
    const f = map.get(slug)
    if (f) f.count++
    else map.set(slug, { slug, name, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
