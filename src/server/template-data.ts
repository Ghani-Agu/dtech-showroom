import 'server-only'
import { imgOr } from '@/lib/img'
import type { Brand, Category, ProductWithRelations } from '@/db/schema'
import type {
  RenderData,
  ProductCtx,
  CategoryCtx,
  BrandCtx,
  ProductCardCtx,
  CatalogCtx,
  SpecItem,
  SiteCtx,
} from '@/components/admin/editor/render-context'

/** Real site contact details, exposed as {{site.*}} tokens. */
export const SITE_CTX: SiteCtx = {
  name: 'D-Tech Algérie',
  phone: '0560 99 05 06',
  sav: '0561 616 911',
  whatsapp: '213560990506',
  email: 'contact@dtech.dz',
  address: 'Bab Ezzouar, Alger',
}

/** Normalise the product `specs` jsonb (object map or array) to label/value. */
function normalizeSpecs(raw: unknown): SpecItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (x && typeof x === 'object') {
          const o = x as Record<string, unknown>
          return {
            label: String(o.label ?? o.key ?? o.name ?? ''),
            value: String(o.value ?? o.val ?? ''),
          }
        }
        return { label: '', value: String(x) }
      })
      .filter((s) => s.label || s.value)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
      label: k,
      value: String(v),
    }))
  }
  return []
}

function toCard(p: ProductWithRelations): ProductCardCtx {
  return {
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    price: '',
    rating: '',
    image: imgOr(p.cardImagePath),
    url: `/products/${p.slug}`,
  }
}

export function buildProductData(
  p: ProductWithRelations,
  related: ProductWithRelations[]
): RenderData {
  const gallery = Array.isArray(p.photoCarouselPaths)
    ? (p.photoCarouselPaths as unknown[]).filter(
        (s): s is string => typeof s === 'string'
      )
    : []
  const sources =
    gallery.length > 0
      ? gallery
      : [p.heroImagePath ?? p.cardImagePath, p.cardImagePath].filter(
          (s): s is string => !!s
        )
  const images = sources.map((s) => imgOr(s))

  const product: ProductCtx = {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    brandName: p.brand.name,
    brandSlug: p.brand.slug,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    cardSpec: p.cardSpec,
    image: imgOr(p.heroImagePath ?? p.cardImagePath),
    cardImage: imgOr(p.cardImagePath),
    images,
    specs: normalizeSpecs(p.specs),
    inquiryUrl: `/inquiry/${p.slug}`,
    productUrl: `/products/${p.slug}`,
    related: related.map(toCard),
  }
  return { site: SITE_CTX, product }
}

export function buildCategoryData(
  c: Category,
  products: ProductWithRelations[],
  count: number
): RenderData {
  const category: CategoryCtx = {
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    count,
    url: `/categories/${c.slug}`,
    products: products.map(toCard),
  }
  return { site: SITE_CTX, category }
}

export function buildBrandData(
  b: Brand,
  products: ProductWithRelations[],
  count: number
): RenderData {
  const brand: BrandCtx = {
    slug: b.slug,
    name: b.name,
    statement: b.statement ?? '',
    description: b.description ?? '',
    count,
    url: `/brands/${b.slug}`,
    products: products.map(toCard),
  }
  return { site: SITE_CTX, brand }
}

export function buildHomeData(
  products: ProductWithRelations[],
  categories: Category[],
  brands: Brand[]
): RenderData {
  const countByCat = new Map<string, number>()
  const countByBrand = new Map<string, number>()
  for (const p of products) {
    countByCat.set(p.category.slug, (countByCat.get(p.category.slug) ?? 0) + 1)
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }
  const featured = products.filter((p) => p.featured)
  const catalog: CatalogCtx = {
    productCount: products.length,
    categoryCount: categories.length,
    brandCount: brands.length,
    products: products.slice(0, 12).map(toCard),
    featured: (featured.length ? featured : products).slice(0, 8).map(toCard),
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      count: countByCat.get(c.slug) ?? 0,
    })),
    brands: brands.map((b) => ({
      name: b.name,
      slug: b.slug,
      count: countByBrand.get(b.slug) ?? 0,
    })),
  }
  return { site: SITE_CTX, catalog }
}
