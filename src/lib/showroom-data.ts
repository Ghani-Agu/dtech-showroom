import { imgOr } from '@/lib/img'
import type { ProductWithRelations } from '@/db/schema'
import type { ExplorerProduct } from '@/types/catalog'

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
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : undefined,
  }))
}
