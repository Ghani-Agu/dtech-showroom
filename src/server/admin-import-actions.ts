'use server'

import { revalidatePath } from 'next/cache'
import { inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'
import { requireSession } from '@/lib/auth-helpers'
import { productFormSchema } from '@/lib/validations/product'

interface ImportRow {
  slug: string
  name: string
  brandSlug: string
  categorySlug: string
  tier: 'hero' | 'featured' | 'longtail'
  tagline?: string
  description?: string
  cardSpec?: string
  searchKeywords?: string
  nameFr?: string
  taglineFr?: string
  descriptionFr?: string
  cardSpecFr?: string
  searchKeywordsFr?: string
  featured?: boolean
  sortOrder?: number
  cardImagePath?: string
  heroImagePath?: string
  seoTitle?: string
  seoDescription?: string
}

export interface ImportResult {
  ok: boolean
  inserted: number
  errors: Array<{ rowIndex: number; message: string }>
}

export async function bulkInsertProducts(
  rows: ImportRow[]
): Promise<ImportResult> {
  await requireSession()

  if (rows.length === 0) {
    return {
      ok: false,
      inserted: 0,
      errors: [{ rowIndex: -1, message: 'No rows to import' }],
    }
  }

  if (rows.length > 1000) {
    return {
      ok: false,
      inserted: 0,
      errors: [
        { rowIndex: -1, message: 'Too many rows (max 1000 per import)' },
      ],
    }
  }

  const uniqueBrandSlugs = [...new Set(rows.map((r) => r.brandSlug))]
  const uniqueCategorySlugs = [...new Set(rows.map((r) => r.categorySlug))]

  const [brandRows, categoryRows] = await Promise.all([
    db
      .select({ id: brands.id, slug: brands.slug })
      .from(brands)
      .where(inArray(brands.slug, uniqueBrandSlugs)),
    db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.slug, uniqueCategorySlugs)),
  ])

  const brandSlugToId = new Map(brandRows.map((b) => [b.slug, b.id]))
  const categorySlugToId = new Map(
    categoryRows.map((c) => [c.slug, c.id])
  )

  const errors: Array<{ rowIndex: number; message: string }> = []
  const toInsert: Array<Record<string, unknown>> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const brandId = brandSlugToId.get(row.brandSlug)
    const categoryId = categorySlugToId.get(row.categorySlug)

    if (!brandId) {
      errors.push({
        rowIndex: i,
        message: `Brand slug not found: ${row.brandSlug}`,
      })
      continue
    }

    if (!categoryId) {
      errors.push({
        rowIndex: i,
        message: `Category slug not found: ${row.categorySlug}`,
      })
      continue
    }

    const candidate = {
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? '',
      description: row.description ?? '',
      cardSpec: row.cardSpec ?? '',
      searchKeywords: row.searchKeywords ?? '',
      nameFr: row.nameFr ?? '',
      taglineFr: row.taglineFr ?? '',
      descriptionFr: row.descriptionFr ?? '',
      cardSpecFr: row.cardSpecFr ?? '',
      searchKeywordsFr: row.searchKeywordsFr ?? '',
      brandId,
      categoryId,
      tier: row.tier,
      featured: row.featured ?? false,
      sortOrder: row.sortOrder ?? 100,
      specs: {},
      cardImagePath: row.cardImagePath ?? '',
      heroImagePath: row.heroImagePath ?? '',
      glbModelPath: '',
      photoCarouselPaths: [],
      seoTitle: row.seoTitle ?? '',
      seoDescription: row.seoDescription ?? '',
    }

    const parsed = productFormSchema.safeParse(candidate)
    if (!parsed.success) {
      const firstError = Object.entries(
        parsed.error.flatten().fieldErrors
      )[0]
      if (firstError) {
        const [field, messages] = firstError
        const message = messages?.[0] ?? 'Validation failed'
        errors.push({ rowIndex: i, message: `${field}: ${message}` })
      } else {
        errors.push({ rowIndex: i, message: 'Validation failed' })
      }
      continue
    }

    toInsert.push({
      ...parsed.data,
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    })
  }

  if (errors.length > 0) {
    return { ok: false, inserted: 0, errors }
  }

  try {
    await db.transaction(async (tx) => {
      const chunkSize = 100
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
        await tx.insert(products).values(chunk as never)
      }
    })

    revalidatePath('/admin/products')
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/brands')
    revalidatePath('/categories')
    revalidatePath('/search')

    return { ok: true, inserted: toInsert.length, errors: [] }
  } catch (err) {
    console.error('[bulk-insert] Transaction failed:', err)
    return {
      ok: false,
      inserted: 0,
      errors: [
        {
          rowIndex: -1,
          message:
            err instanceof Error
              ? err.message
              : 'Database transaction failed',
        },
      ],
    }
  }
}

export async function getImportContext() {
  await requireSession()

  const [existingSlugs, brandSlugs, categorySlugs] = await Promise.all([
    db
      .select({ slug: products.slug })
      .from(products)
      .then((rows) => rows.map((r) => r.slug)),
    db
      .select({ slug: brands.slug })
      .from(brands)
      .then((rows) => rows.map((r) => r.slug)),
    db
      .select({ slug: categories.slug })
      .from(categories)
      .then((rows) => rows.map((r) => r.slug)),
  ])

  return {
    existingSlugs,
    brandSlugs,
    categorySlugs,
  }
}
