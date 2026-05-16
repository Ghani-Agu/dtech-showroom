import 'server-only'
import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  brands,
  categories,
  products,
  inquiries,
  type Brand,
  type Category,
  type Inquiry,
  type ProductWithRelations,
} from '@/db/schema'

// Wraps a DB call so a missing/unreachable database degrades to a safe
// fallback rather than 500ing every page. Pages render their chrome and
// an EmptyState; getBySlug callers see null and route to notFound().
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[queries] DB call failed, returning fallback:',
        err instanceof Error ? err.message : String(err)
      )
    }
    return fallback
  }
}

export async function getAllBrands(): Promise<Brand[]> {
  return safe(
    () =>
      db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    []
  )
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, slug))
      .limit(1)
    return rows[0] ?? null
  }, null)
}

export async function getAllCategories(): Promise<Category[]> {
  return safe(
    () =>
      db
        .select()
        .from(categories)
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
    []
  )
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)
    return rows[0] ?? null
  }, null)
}

export async function getProductBySlug(
  slug: string
): Promise<ProductWithRelations | null> {
  return safe(async () => {
    const row = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), isNull(products.archivedAt)),
      with: { brand: true, category: true },
    })
    return row ?? null
  }, null)
}

export async function getProductsByBrand(
  brandSlug: string
): Promise<ProductWithRelations[]> {
  return safe(async () => {
    const brand = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, brandSlug))
      .limit(1)
    const brandRow = brand[0]
    if (!brandRow) return []
    return db.query.products.findMany({
      where: and(
        eq(products.brandId, brandRow.id),
        isNull(products.archivedAt)
      ),
      with: { brand: true, category: true },
      orderBy: [asc(products.sortOrder), asc(products.name)],
    })
  }, [])
}

export async function getProductsByCategory(
  categorySlug: string
): Promise<ProductWithRelations[]> {
  return safe(async () => {
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1)
    const categoryRow = category[0]
    if (!categoryRow) return []
    return db.query.products.findMany({
      where: and(
        eq(products.categoryId, categoryRow.id),
        isNull(products.archivedAt)
      ),
      with: { brand: true, category: true },
      orderBy: [asc(products.sortOrder), asc(products.name)],
    })
  }, [])
}

export async function getFeaturedProducts(
  limit = 8
): Promise<ProductWithRelations[]> {
  return safe(
    () =>
      db.query.products.findMany({
        where: and(
          eq(products.featured, true),
          isNull(products.archivedAt)
        ),
        with: { brand: true, category: true },
        orderBy: [asc(products.sortOrder)],
        limit,
      }),
    []
  )
}

export async function getRelatedProducts(
  productId: string,
  brandId: string,
  limit = 3
): Promise<ProductWithRelations[]> {
  return safe(
    () =>
      db.query.products.findMany({
        where: and(
          eq(products.brandId, brandId),
          ne(products.id, productId),
          isNull(products.archivedAt)
        ),
        with: { brand: true, category: true },
        orderBy: [asc(products.sortOrder)],
        limit,
      }),
    []
  )
}

export async function searchProducts(
  query: string
): Promise<ProductWithRelations[]> {
  const q = `%${query.trim()}%`
  return safe(
    () =>
      db.query.products.findMany({
        where: and(
          isNull(products.archivedAt),
          or(
            ilike(products.name, q),
            ilike(products.tagline, q),
            ilike(products.searchKeywords, q),
            ilike(products.cardSpec, q),
            sql`EXISTS (SELECT 1 FROM ${brands} b WHERE b.id = ${products.brandId} AND b.name ILIKE ${q})`,
            sql`EXISTS (SELECT 1 FROM ${categories} c WHERE c.id = ${products.categoryId} AND c.name ILIKE ${q})`
          )
        ),
        with: { brand: true, category: true },
        orderBy: [asc(products.sortOrder), asc(products.name)],
        limit: 60,
      }),
    []
  )
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  return safe(
    () => db.select().from(inquiries).orderBy(desc(inquiries.submittedAt)),
    []
  )
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, id))
      .limit(1)
    return rows[0] ?? null
  }, null)
}
