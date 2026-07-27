'use server'

import { revalidatePath } from 'next/cache'
import { count, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { categories, products } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import {
  categoryFormSchema,
  type CategoryFormValues,
} from '@/lib/validations/category'

function normalize(values: CategoryFormValues) {
  return {
    ...values,
    nameFr: values.nameFr || null,
    descriptionFr: values.descriptionFr || null,
    searchKeywords: values.searchKeywords || null,
    searchKeywordsFr: values.searchKeywordsFr || null,
    heroImagePath: values.heroImagePath || null,
  }
}

export async function createCategory(values: CategoryFormValues) {
  await requireSection('categories')

  const parsed = categoryFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    return {
      ok: false as const,
      errors: { slug: ['A category with this slug already exists'] },
    }
  }

  const inserted = await db
    .insert(categories)
    .values(normalize(parsed.data))
    .returning({ id: categories.id })

  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  revalidatePath('/')

  const newId = inserted[0]?.id
  if (!newId) {
    return { ok: false as const, errors: { _form: ['Insert failed'] } }
  }
  return { ok: true as const, id: newId }
}

export async function updateCategory(
  categoryId: string,
  values: CategoryFormValues
) {
  await requireSection('categories')

  const parsed = categoryFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const slugTaken = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (slugTaken && slugTaken.id !== categoryId) {
    return {
      ok: false as const,
      errors: { slug: ['A category with this slug already exists'] },
    }
  }

  await db
    .update(categories)
    .set({ ...normalize(parsed.data), updatedAt: new Date() })
    .where(eq(categories.id, categoryId))

  revalidatePath('/admin/categories')
  revalidatePath(`/admin/categories/${categoryId}/edit`)
  revalidatePath(`/categories/${parsed.data.slug}`)
  revalidatePath('/categories')
  revalidatePath('/')

  return { ok: true as const, id: categoryId }
}

export async function archiveCategory(categoryId: string) {
  await requireSection('categories')

  await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(eq(categories.id, categoryId))

  revalidatePath('/admin/categories')
  revalidatePath('/categories')

  return { ok: true as const }
}

export async function restoreCategory(categoryId: string) {
  await requireSection('categories')

  await db
    .update(categories)
    .set({ archivedAt: null })
    .where(eq(categories.id, categoryId))

  revalidatePath('/admin/categories')
  revalidatePath('/categories')

  return { ok: true as const }
}

/**
 * Permanently removes a category — only allowed when no product uses it,
 * so the catalog can never break.
 */
export async function deleteCategoryPermanently(categoryId: string) {
  await requireSection('categories')

  const used = await db
    .select({ n: count() })
    .from(products)
    .where(eq(products.categoryId, categoryId))
    .then((rows) => rows[0]?.n ?? 0)

  if (used > 0) {
    return {
      ok: false as const,
      error: `Impossible de supprimer : ${used} produit(s) utilisent cette catégorie. Déplacez-les ou supprimez-les d'abord.`,
    }
  }

  await db.delete(categories).where(eq(categories.id, categoryId))

  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  revalidatePath('/')

  return { ok: true as const }
}
