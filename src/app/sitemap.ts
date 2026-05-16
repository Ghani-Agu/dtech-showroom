import type { MetadataRoute } from 'next'
import { isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  brands,
  categories,
  products,
  type Brand,
  type Category,
  type Product,
} from '@/db/schema'

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'

export const revalidate = 3600 // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let allBrands: Brand[] = []
  let allCategories: Category[] = []
  let allProducts: Product[] = []

  try {
    ;[allBrands, allCategories, allProducts] = await Promise.all([
      db.select().from(brands),
      db.select().from(categories),
      db.select().from(products).where(isNull(products.archivedAt)),
    ])
  } catch {
    // DB unavailable at build time — sitemap will be the static-only baseline
  }

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  const brandRoutes: MetadataRoute.Sitemap = allBrands.map((brand) => ({
    url: `${BASE_URL}/brands/${brand.slug}`,
    lastModified: brand.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = allCategories.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const productRoutes: MetadataRoute.Sitemap = allProducts.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...brandRoutes, ...categoryRoutes, ...productRoutes]
}
