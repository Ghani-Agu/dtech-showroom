'use server'

import { revalidatePath } from 'next/cache'
import { revalidateStorefront } from '@/lib/revalidate'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sitePages, imageBlobs } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import { processHeroSlide, validateImage } from '@/lib/image-processing'
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
): Promise<
  { ok: true; url: string; w: number; h: number } | { ok: false; error: string }
> {
  try {
    await requireSection('editor')
    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'Aucun fichier reçu' }

    const buf = Buffer.from(await file.arrayBuffer())
    await validateImage(buf)
    const hash = generateHash(`${file.name}-${Date.now()}`)

    /* ROUND 23b — no fixed crop. The slide keeps its own aspect ratio and we
       carry the real output size back to the editor, which stores it on the
       slide so the storefront band can size itself to the artwork. */
    if (R2_CONFIGURED) {
      const [webp, avif] = await Promise.all([
        processHeroSlide(buf, 'webp'),
        processHeroSlide(buf, 'avif'),
      ])
      const [up] = await Promise.all([
        uploadToR2(`hero/slide-${hash}.webp`, webp.data, 'image/webp'),
        uploadToR2(`hero/slide-${hash}.avif`, avif.data, 'image/avif'),
      ])
      return { ok: true, url: up.url, w: webp.width, h: webp.height }
    }

    const webp = await processHeroSlide(buf, 'webp')
    const key = `hero/slide-${hash}.webp`
    await db
      .insert(imageBlobs)
      .values({ key, contentType: 'image/webp', data: webp.data })
      .onConflictDoUpdate({
        target: imageBlobs.key,
        set: { contentType: 'image/webp', data: webp.data },
      })
    return { ok: true, url: `/api/images/${key}`, w: webp.width, h: webp.height }
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
    revalidateStorefront()
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
    revalidateStorefront()
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}
