'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { brands } from '@/db/schema'
import { requireSession } from '@/lib/auth-helpers'
import {
  brandFormSchema,
  type BrandFormValues,
} from '@/lib/validations/brand'

function normalize(values: BrandFormValues) {
  return {
    ...values,
    nameFr: values.nameFr || null,
    statementFr: values.statementFr || null,
    descriptionFr: values.descriptionFr || null,
    searchKeywords: values.searchKeywords || null,
    searchKeywordsFr: values.searchKeywordsFr || null,
    logoPath: values.logoPath || null,
    heroImagePath: values.heroImagePath || null,
  }
}

export async function createBrand(values: BrandFormValues) {
  await requireSession()

  const parsed = brandFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    return {
      ok: false as const,
      errors: { slug: ['A brand with this slug already exists'] },
    }
  }

  const inserted = await db
    .insert(brands)
    .values(normalize(parsed.data))
    .returning({ id: brands.id })

  revalidatePath('/admin/brands')
  revalidatePath('/brands')
  revalidatePath('/')

  const newId = inserted[0]?.id
  if (!newId) {
    return { ok: false as const, errors: { _form: ['Insert failed'] } }
  }
  return { ok: true as const, id: newId }
}

export async function updateBrand(
  brandId: string,
  values: BrandFormValues
) {
  await requireSession()

  const parsed = brandFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const slugTaken = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])

  if (slugTaken && slugTaken.id !== brandId) {
    return {
      ok: false as const,
      errors: { slug: ['A brand with this slug already exists'] },
    }
  }

  await db
    .update(brands)
    .set({ ...normalize(parsed.data), updatedAt: new Date() })
    .where(eq(brands.id, brandId))

  revalidatePath('/admin/brands')
  revalidatePath(`/admin/brands/${brandId}/edit`)
  revalidatePath(`/brands/${parsed.data.slug}`)
  revalidatePath('/brands')
  revalidatePath('/')

  return { ok: true as const, id: brandId }
}

export async function archiveBrand(brandId: string) {
  await requireSession()

  await db
    .update(brands)
    .set({ archivedAt: new Date() })
    .where(eq(brands.id, brandId))

  revalidatePath('/admin/brands')
  revalidatePath('/brands')

  return { ok: true as const }
}

export async function restoreBrand(brandId: string) {
  await requireSession()

  await db
    .update(brands)
    .set({ archivedAt: null })
    .where(eq(brands.id, brandId))

  revalidatePath('/admin/brands')
  revalidatePath('/brands')

  return { ok: true as const }
}
