'use server'

import { revalidatePath } from 'next/cache'
import { eq, like } from 'drizzle-orm'
import { db } from '@/db/client'
import { imageBlobs, products } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import {
  productFormSchema,
  type ProductFormValues,
} from '@/lib/validations/product'



export async function createProduct(values: ProductFormValues) {
  await requireSection('products')

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
  await requireSection('products')

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
  await requireSection('products')

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
  await requireSection('products')

  await db
    .update(products)
    .set({ archivedAt: null })
    .where(eq(products.id, productId))

  revalidatePath('/admin/products')
  revalidatePath('/admin')

  return { ok: true as const }
}

/**
 * Permanently removes a product and its DB-hosted images. Irreversible —
 * the UI requires an explicit confirmation before calling this.
 */
export async function deleteProductPermanently(productId: string) {
  await requireSection('products')

  const product = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .then((rows) => rows[0])

  if (!product) {
    return { ok: false as const, error: 'Produit introuvable' }
  }

  await db.delete(products).where(eq(products.id, productId))
  await db
    .delete(imageBlobs)
    .where(like(imageBlobs.key, `products/${product.slug}/%`))
    .catch(() => {
      /* images are best-effort */
    })

  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/')

  return { ok: true as const }
}
