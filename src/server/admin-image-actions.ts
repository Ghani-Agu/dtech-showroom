'use server'

import { headers } from 'next/headers'
import { eq, like } from 'drizzle-orm'
import { db } from '@/db/client'
import { imageBlobs } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireSection } from '@/lib/auth-helpers'
import type { SectionKey } from '@/lib/permissions'
import {
  processVariant,
  validateImage,
  type ImageVariant,
} from '@/lib/image-processing'
import {
  R2_CONFIGURED,
  deleteFromR2,
  extractKeyFromUrl,
  generateHash,
  uploadToR2,
} from '@/lib/r2'
import { ENTITY_PREFIX, type EntityType } from '@/lib/admin-image-entity'

const DB_IMAGE_PREFIX = '/api/images/'

async function requireSession() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session.user
}

interface UploadResult {
  url: string
  urlAvif: string
  variant: ImageVariant
  width: number
  height: number
}

/**
 * Uploads an entity image. When Cloudflare R2 is configured the image is
 * pushed there (webp + avif); otherwise it is stored in Postgres
 * (image_blobs, webp only) and served from /api/images — zero external
 * config needed.
 */
export async function uploadEntityImage(
  entityType: EntityType,
  entitySlug: string,
  variant: ImageVariant,
  formData: FormData
): Promise<
  { ok: true; result: UploadResult } | { ok: false; error: string }
> {
  try {
    const sectionMap: Record<EntityType, SectionKey> = {
      product: 'products',
      brand: 'brands',
      category: 'categories',
    }
    await requireSection(sectionMap[entityType])

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return { ok: false, error: 'Aucun fichier reçu' }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entitySlug)) {
      return { ok: false, error: 'Slug invalide' }
    }

    const arrayBuffer = await file.arrayBuffer()
    const sourceBuffer = Buffer.from(arrayBuffer)

    const meta = await validateImage(sourceBuffer)
    const hash = generateHash(file.name)
    const prefix = ENTITY_PREFIX[entityType]

    if (R2_CONFIGURED) {
      const [webpBuffer, avifBuffer] = await Promise.all([
        processVariant(sourceBuffer, variant, 'webp'),
        processVariant(sourceBuffer, variant, 'avif'),
      ])
      const webpKey = `${prefix}/${entitySlug}/${variant}-${hash}.webp`
      const avifKey = `${prefix}/${entitySlug}/${variant}-${hash}.avif`
      const [webpResult, avifResult] = await Promise.all([
        uploadToR2(webpKey, webpBuffer, 'image/webp'),
        uploadToR2(avifKey, avifBuffer, 'image/avif'),
      ])
      return {
        ok: true,
        result: {
          url: webpResult.url,
          urlAvif: avifResult.url,
          variant,
          width: meta.width,
          height: meta.height,
        },
      }
    }

    // ── DB storage (default) ──
    const webpBuffer = await processVariant(sourceBuffer, variant, 'webp')
    const key = `${prefix}/${entitySlug}/${variant}-${hash}.webp`

    await db
      .insert(imageBlobs)
      .values({ key, contentType: 'image/webp', data: webpBuffer })
      .onConflictDoUpdate({
        target: imageBlobs.key,
        set: { contentType: 'image/webp', data: webpBuffer },
      })

    const url = `${DB_IMAGE_PREFIX}${key}`
    return {
      ok: true,
      result: {
        url,
        urlAvif: url,
        variant,
        width: meta.width,
        height: meta.height,
      },
    }
  } catch (err) {
    console.error('[upload] Failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Échec de l'envoi",
    }
  }
}

/** @deprecated Use uploadEntityImage instead */
export async function uploadProductImage(
  productSlug: string,
  variant: ImageVariant,
  formData: FormData
) {
  return uploadEntityImage('product', productSlug, variant, formData)
}

export async function deleteEntityImage(
  imageUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSession()

    // DB-hosted image
    if (imageUrl.startsWith(DB_IMAGE_PREFIX)) {
      const key = imageUrl.slice(DB_IMAGE_PREFIX.length)
      await db.delete(imageBlobs).where(eq(imageBlobs.key, key))
      return { ok: true }
    }

    const key = extractKeyFromUrl(imageUrl)
    if (!key) {
      return { ok: false, error: 'URL d’image invalide' }
    }

    await deleteFromR2(key)

    if (key.endsWith('.webp')) {
      const avifKey = key.replace(/\.webp$/, '.avif')
      await deleteFromR2(avifKey).catch(() => {
        /* sibling may not exist */
      })
    } else if (key.endsWith('.avif')) {
      const webpKey = key.replace(/\.avif$/, '.webp')
      await deleteFromR2(webpKey).catch(() => {
        /* sibling may not exist */
      })
    }

    return { ok: true }
  } catch (err) {
    console.error('[delete] Failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Échec de la suppression',
    }
  }
}

/** Removes every DB-hosted image stored under an entity's key prefix. */
export async function deleteEntityImagesBySlug(
  entityType: EntityType,
  entitySlug: string
): Promise<void> {
  await requireSession()
  const prefix = `${ENTITY_PREFIX[entityType]}/${entitySlug}/%`
  await db.delete(imageBlobs).where(like(imageBlobs.key, prefix))
}

/** @deprecated Use deleteEntityImage instead */
export async function deleteProductImage(imageUrl: string) {
  return deleteEntityImage(imageUrl)
}
