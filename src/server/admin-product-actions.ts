'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { products } from '@/db/schema'
import { auth } from '@/lib/auth'
import {
  productFormSchema,
  type ProductFormValues,
} from '@/lib/validations/product'

async function requireSession() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session.user
}

export async function createProduct(values: ProductFormValues) {
  await requireSession()

  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    return {
      ok: false as const,
      errors: { slug: ['A product with this slug already exists'] },
    }
  }

  const inserted = await db
    .insert(products)
    .values({
      ...parsed.data,
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    })
    .returning({ id: products.id })

  const newId = inserted[0]?.id

  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/categories')

  if (!newId) {
    return {
      ok: false as const,
      errors: { _form: ['Failed to create product'] },
    }
  }

  return { ok: true as const, id: newId }
}

export async function updateProduct(
  productId: string,
  values: ProductFormValues
) {
  await requireSession()

  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const slugTaken = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (slugTaken && slugTaken.id !== productId) {
    return {
      ok: false as const,
      errors: { slug: ['A product with this slug already exists'] },
    }
  }

  await db
    .update(products)
    .set({
      ...parsed.data,
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  revalidatePath(`/products/${parsed.data.slug}`)
  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/categories')

  return { ok: true as const, id: productId }
}

export async function archiveProduct(productId: string) {
  await requireSession()

  const product = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .then((rows) => rows[0])

  if (!product) {
    return { ok: false as const, error: 'Product not found' as const }
  }

  await db
    .update(products)
    .set({ archivedAt: new Date() })
    .where(eq(products.id, productId))

  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath(`/products/${product.slug}`)
  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/categories')

  return { ok: true as const }
}

export async function restoreProduct(productId: string) {
  await requireSession()

  await db
    .update(products)
    .set({ archivedAt: null })
    .where(eq(products.id, productId))

  revalidatePath('/admin/products')
  revalidatePath('/admin')

  return { ok: true as const }
}
