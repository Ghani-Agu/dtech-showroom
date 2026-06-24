'use server'

/**
 * Server actions for the storefront design switch (Apparence admin page).
 *
 * The active design is stored in `site_pages` under the key `site:design`
 * as `{ active: DesignId }`, using the same draft → published model as the
 * rest of the editor:
 *   - `saveDesignDraft` stages a selection (does NOT affect the live site).
 *   - `publishDesign` takes a selection LIVE (copies it to `published` and
 *      revalidates so /fr and /ar re-render in the chosen design).
 *
 * Both designs are fed by the identical product/category/brand queries, so
 * switching never touches data — only which interface renders.
 */

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sitePages } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'
import { DESIGN_KEY } from '@/server/editor-page-data'
import { isDesignId, type DesignId } from '@/lib/site-design'

export interface DesignResult {
  ok: boolean
  error?: string
}

/** Stage a design selection without taking it live. */
export async function saveDesignDraft(id: DesignId): Promise<DesignResult> {
  try {
    await requireSection('editor')
    if (!isDesignId(id)) return { ok: false, error: 'Design invalide' }
    const draft = { active: id }
    await db
      .insert(sitePages)
      .values({ key: DESIGN_KEY, draft, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sitePages.key,
        set: { draft, updatedAt: new Date() },
      })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

/** Take a design LIVE — visitors immediately see the chosen interface. */
export async function publishDesign(id: DesignId): Promise<DesignResult> {
  try {
    await requireSection('editor')
    if (!isDesignId(id)) return { ok: false, error: 'Design invalide' }
    const value = { active: id }
    const now = new Date()
    await db
      .insert(sitePages)
      .values({ key: DESIGN_KEY, draft: value, published: value, updatedAt: now, publishedAt: now })
      .onConflictDoUpdate({
        target: sitePages.key,
        set: { draft: value, published: value, updatedAt: now, publishedAt: now },
      })
    // Re-render the whole storefront (all routes, both locales).
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}
