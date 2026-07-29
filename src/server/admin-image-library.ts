'use server'

import { desc, isNotNull, ne, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { withDb } from '@/db/health'
import { brands, categories, imageBlobs, products } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import type { SectionKey } from '@/lib/permissions'
import type { EntityType } from '@/lib/admin-image-entity'

/**
 * admin-image-library.ts — "choisir une image déjà en ligne".
 *
 * ROUND 22. Every image field in the admin was upload-only: the only way to
 * put a picture somewhere was to have the file on the machine you were
 * sitting at. Re-using a photo that is already on the site — a brand hero you
 * uploaded from the office PC, a product shot, a category cover — meant
 * finding the original file again.
 *
 * This returns everything the site already has, from two sources:
 *
 *   1. `image_blobs` — every image uploaded through the admin when R2 is not
 *      configured (the default). These are the real uploads, newest first.
 *   2. the paths actually referenced by products / brands / categories —
 *      which also catches R2 URLs and the files shipped in /public that were
 *      never uploaded through the admin at all.
 *
 * Deduped, capped, and cheap: two indexed reads and three column scans over
 * tables that are a few hundred rows.
 */

export interface LibraryImage {
  /** The value to store in the form field (path or absolute URL). */
  url: string
  /** Human-readable, e.g. "brands/asus/hero-cfd2d08e.webp". */
  label: string
  /** Rough grouping so the picker can show sections. */
  group: 'uploads' | 'catalogue'
}

const SECTION: Record<EntityType, SectionKey> = {
  product: 'products',
  brand: 'brands',
  category: 'categories',
}

const MAX = 300

function label(url: string): string {
  const clean = url.split('?')[0] ?? url
  return clean.replace(/^\/api\/images\//, '').replace(/^https?:\/\/[^/]+\//, '')
}

export async function listLibraryImages(
  entityType: EntityType
): Promise<{ ok: true; images: LibraryImage[] } | { ok: false; error: string }> {
  try {
    await requireSection(SECTION[entityType])

    const [blobs, prodCards, prodHeroes, brandImgs, catImgs] = await withDb(
      () =>
        Promise.all([
          db
            .select({ key: imageBlobs.key })
            .from(imageBlobs)
            .orderBy(desc(imageBlobs.createdAt))
            .limit(MAX),
          db
            .select({ p: products.cardImagePath })
            .from(products)
            .where(and(isNotNull(products.cardImagePath), ne(products.cardImagePath, '')))
            .limit(MAX),
          db
            .select({ p: products.heroImagePath })
            .from(products)
            .where(and(isNotNull(products.heroImagePath), ne(products.heroImagePath, '')))
            .limit(MAX),
          db
            .select({ hero: brands.heroImagePath, logo: brands.logoPath })
            .from(brands)
            .limit(MAX),
          db
            .select({ hero: categories.heroImagePath })
            .from(categories)
            .limit(MAX),
        ]),
      8_000
    )

    const seen = new Set<string>()
    const images: LibraryImage[] = []

    function push(url: string | null | undefined, group: LibraryImage['group']) {
      if (!url || !url.trim()) return
      const u = url.trim()
      if (seen.has(u)) return
      seen.add(u)
      images.push({ url: u, label: label(u), group })
    }

    for (const b of blobs) push(`/api/images/${b.key}`, 'uploads')
    for (const r of prodHeroes) push(r.p, 'catalogue')
    for (const r of brandImgs) {
      push(r.hero, 'catalogue')
      push(r.logo, 'catalogue')
    }
    for (const r of catImgs) push(r.hero, 'catalogue')
    for (const r of prodCards) push(r.p, 'catalogue')

    return { ok: true, images: images.slice(0, MAX * 2) }
  } catch (err) {
    console.warn('[image-library] unavailable:', err)
    return {
      ok: false,
      error:
        err instanceof Error && err.message === 'Unauthorized'
          ? 'Accès refusé'
          : 'La bibliothèque d’images est momentanément indisponible.',
    }
  }
}
