'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sitePages, imageBlobs } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import { processVariant, validateImage } from '@/lib/image-processing'
import { R2_CONFIGURED, generateHash, uploadToR2 } from '@/lib/r2'
import { sanitizeHeroConfig, type HeroConfig } from '@/components/home/hero-config'

const HERO_KEY = 'home-hero'

export interface HeroActionResult {
  ok: boolean
  error?: string
}

/** Upload one hero slide image (R2 if configured, else Postgres image_blobs). */
export async function uploadHeroImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireSection('editor')
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'Aucun fichier reçu' }

    const buf = Buffer.from(await file.arrayBuffer())
    await validateImage(buf)
    const hash = generateHash(`${file.name}-${Date.now()}`)

    if (R2_CONFIGURED) {
      const [webp, avif] = await Promise.all([
        processVariant(buf, 'hero', 'webp'),
        processVariant(buf, 'hero', 'avif'),
      ])
      const [w] = await Promise.all([
        uploadToR2(`hero/slide-${hash}.webp`, webp, 'image/webp'),
        uploadToR2(`hero/slide-${hash}.avif`, avif, 'image/avif'),
      ])
      return { ok: true, url: w.url }
    }

    const webp = await processVariant(buf, 'hero', 'webp')
    const key = `hero/slide-${hash}.webp`
    await db
      .insert(imageBlobs)
      .values({ key, contentType: 'image/webp', data: webp })
      .onConflictDoUpdate({
        target: imageBlobs.key,
        set: { contentType: 'image/webp', data: webp },
      })
    return { ok: true, url: `/api/images/${key}` }
  } catch (err) {
    console.error('[hero upload] Failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : "Échec de l'envoi" }
  }
}

/** Save the hero draft (private). */
export async function saveHeroDraft(input: unknown): Promise<HeroActionResult> {
  try {
    await requireSection('editor')
    const cfg: HeroConfig = sanitizeHeroConfig(input)
    await db
      .insert(sitePages)
      .values({ key: HERO_KEY, draft: cfg, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sitePages.key,
        set: { draft: cfg, updatedAt: new Date() },
      })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

/** Publish the hero — it goes live on the homepage. */
export async function publishHero(input: unknown): Promise<HeroActionResult> {
  try {
    await requireSection('editor')
    const cfg: HeroConfig = sanitizeHeroConfig(input)
    const now = new Date()
    await db
      .insert(sitePages)
      .values({ key: HERO_KEY, draft: cfg, published: cfg, updatedAt: now, publishedAt: now })
      .onConflictDoUpdate({
        target: sitePages.key,
        set: { draft: cfg, published: cfg, updatedAt: now, publishedAt: now },
      })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

/** Unpublish — the homepage reverts to the default (featured-product) slider. */
export async function unpublishHero(): Promise<HeroActionResult> {
  try {
    await requireSection('editor')
    await db
      .update(sitePages)
      .set({ published: null, publishedAt: null, updatedAt: new Date() })
      .where(eq(sitePages.key, HERO_KEY))
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}
