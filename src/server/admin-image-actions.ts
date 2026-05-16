'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import {
  processVariant,
  validateImage,
  type ImageVariant,
} from '@/lib/image-processing'
import {
  deleteFromR2,
  extractKeyFromUrl,
  generateHash,
  uploadToR2,
} from '@/lib/r2'
import {
  ENTITY_PREFIX,
  type EntityType,
} from '@/lib/admin-image-entity'

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

export async function uploadEntityImage(
  entityType: EntityType,
  entitySlug: string,
  variant: ImageVariant,
  formData: FormData
): Promise<
  { ok: true; result: UploadResult } | { ok: false; error: string }
> {
  try {
    await requireSession()

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return { ok: false, error: 'No file provided' }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entitySlug)) {
      return { ok: false, error: `Invalid ${entityType} slug` }
    }

    const arrayBuffer = await file.arrayBuffer()
    const sourceBuffer = Buffer.from(arrayBuffer)

    const meta = await validateImage(sourceBuffer)

    const [webpBuffer, avifBuffer] = await Promise.all([
      processVariant(sourceBuffer, variant, 'webp'),
      processVariant(sourceBuffer, variant, 'avif'),
    ])

    const hash = generateHash(file.name)
    const prefix = ENTITY_PREFIX[entityType]
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
  } catch (err) {
    console.error('[upload] Failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Upload failed',
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

    const key = extractKeyFromUrl(imageUrl)
    if (!key) {
      return { ok: false, error: 'Invalid image URL' }
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
      error: err instanceof Error ? err.message : 'Delete failed',
    }
  }
}

/** @deprecated Use deleteEntityImage instead */
export async function deleteProductImage(imageUrl: string) {
  return deleteEntityImage(imageUrl)
}
