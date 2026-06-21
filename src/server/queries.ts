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
import { defaultLocale, type Locale } from '@/i18n/config'

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

// Swap EN fields with FR equivalents when locale is fr and FR field exists.
// Keeps the return type the same so callers don't need to know about _fr columns.
function localizeBrand(b: Brand, locale: Locale): Brand {
  if (locale !== 'fr') return b
  return {
    ...b,
    name: b.nameFr ?? b.name,
    statement: b.statementFr ?? b.statement,
    description: b.descriptionFr ?? b.description,
    searchKeywords: b.searchKeywordsFr ?? b.searchKeywords,
  }
}

function localizeCategory(c: Category, locale: Locale): Category {
  if (locale !== 'fr') return c
  return {
    ...c,
    name: c.nameFr ?? c.name,
    description: c.descriptionFr ?? c.description,
    searchKeywords: c.searchKeywordsFr ?? c.searchKeywords,
  }
}

function localizeProduct(
  p: ProductWithRelations,
  locale: Locale
): ProductWithRelations {
  if (locale !== 'fr') {
    return {
      ...p,
      brand: localizeBrand(p.brand, locale),
      category: localizeCategory(p.category, locale),
    }
  }
  return {
    ...p,
    name: p.nameFr ?? p.name,
    tagline: p.taglineFr ?? p.tagline,
    description: p.descriptionFr ?? p.description,
    cardSpec: p.cardSpecFr ?? p.cardSpec,
    searchKeywords: p.searchKeywordsFr ?? p.searchKeywords,
    brand: localizeBrand(p.brand, locale),
    category: localizeCategory(p.category, locale),
  }
}

export async function getAllBrands(
  locale: Locale = defaultLocale
): Promise<Brand[]> {
  const rows = await safe(
    () =>
      db
        .select()
        .from(brands)
        .where(isNull(brands.archivedAt))
        .orderBy(asc(brands.sortOrder), asc(brands.name)),
    [] as Brand[]
  )
  return rows.map((b) => localizeBrand(b, locale))
}

export async function getBrandBySlug(
  slug: string,
  locale: Locale = defaultLocale
): Promise<Brand | null> {
  const row = await safe(async () => {
    const rs = await db
      .select()
      .from(brands)
      .where(and(eq(brands.slug, slug), isNull(brands.archivedAt)))
      .limit(1)
    return rs[0] ?? null
  }, null)
  return row ? localizeBrand(row, locale) : null
}

export async function getAllCategories(
  locale: Locale = defaultLocale
): Promise<Category[]> {
  const rows = await safe(
    () =>
      db
        .select()
        .from(categories)
        .where(isNull(categories.archivedAt))
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
    [] as Category[]
  )
  return rows.map((c) => localizeCategory(c, locale))
}

export async function getCategoryBySlug(
  slug: string,
  locale: Locale = defaultLocale
): Promise<Category | null> {
  const row = await safe(async () => {
    const rs = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.slug, slug), isNull(categories.archivedAt))
      )
      .limit(1)
    return rs[0] ?? null
  }, null)
  return row ? localizeCategory(row, locale) : null
}

export async function getProductBySlug(
  slug: string,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations | null> {
  const row = await safe(async () => {
    const r = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), isNull(products.archivedAt)),
      with: { brand: true, category: true },
    })
    return r ?? null
  }, null)
  return row ? localizeProduct(row, locale) : null
}

export async function getProductsByBrand(
  brandSlug: string,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const rows = await safe(async () => {
    const brand = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, brandSlug))
      .limit(1)
    const brandRow = brand[0]
    if (!brandRow) return [] as ProductWithRelations[]
    return db.query.products.findMany({
      where: and(
        eq(products.brandId, brandRow.id),
        isNull(products.archivedAt)
      ),
      with: { brand: true, category: true },
      orderBy: [asc(products.sortOrder), asc(products.name)],
    })
  }, [] as ProductWithRelations[])
  return rows.map((p) => localizeProduct(p, locale))
}

export async function getProductsByCategory(
  categorySlug: string,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const rows = await safe(async () => {
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1)
    const categoryRow = category[0]
    if (!categoryRow) return [] as ProductWithRelations[]
    return db.query.products.findMany({
      where: and(
        eq(products.categoryId, categoryRow.id),
        isNull(products.archivedAt)
      ),
      with: { brand: true, category: true },
      orderBy: [asc(products.sortOrder), asc(products.name)],
    })
  }, [] as ProductWithRelations[])
  return rows.map((p) => localizeProduct(p, locale))
}

export async function getAllProducts(
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const rows = await safe(
    () =>
      db.query.products.findMany({
        where: isNull(products.archivedAt),
        with: { brand: true, category: true },
        orderBy: [asc(products.sortOrder), asc(products.name)],
      }),
    [] as ProductWithRelations[]
  )
  return rows.map((p) => localizeProduct(p, locale))
}

export async function getFeaturedProducts(
  limit = 8,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const rows = await safe(
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
    [] as ProductWithRelations[]
  )
  return rows.map((p) => localizeProduct(p, locale))
}

export async function getRelatedProducts(
  productId: string,
  brandId: string,
  limit = 3,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const rows = await safe(
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
    [] as ProductWithRelations[]
  )
  return rows.map((p) => localizeProduct(p, locale))
}

export async function searchProducts(
  query: string,
  locale: Locale = defaultLocale
): Promise<ProductWithRelations[]> {
  const q = `%${query.trim()}%`
  const rows = await safe(
    () =>
      db.query.products.findMany({
        where: and(
          isNull(products.archivedAt),
          or(
            ilike(products.name, q),
            ilike(products.nameFr, q),
            ilike(products.tagline, q),
            ilike(products.taglineFr, q),
            ilike(products.searchKeywords, q),
            ilike(products.searchKeywordsFr, q),
            ilike(products.cardSpec, q),
            ilike(products.cardSpecFr, q),
            sql`EXISTS (SELECT 1 FROM ${brands} b WHERE b.id = ${products.brandId} AND (b.name ILIKE ${q} OR b.name_fr ILIKE ${q}))`,
            sql`EXISTS (SELECT 1 FROM ${categories} c WHERE c.id = ${products.categoryId} AND (c.name ILIKE ${q} OR c.name_fr ILIKE ${q}))`
          )
        ),
        with: { brand: true, category: true },
        orderBy: [asc(products.sortOrder), asc(products.name)],
        limit: 60,
      }),
    [] as ProductWithRelations[]
  )
  return rows.map((p) => localizeProduct(p, locale))
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
