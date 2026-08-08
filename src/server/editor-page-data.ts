import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { cachedData } from '@/lib/data-cache'
import { db } from '@/db/client'
import { withDb } from '@/db/health'
import { sitePages, type SitePageRow } from '@/db/schema'
import {
  sanitizeHeroConfig,
  type HeroConfig,
} from '@/components/home/hero-config'
import type { EditData } from '@/components/site-edit/edit-context'
import { coerceDesign, type DesignId } from '@/lib/site-design'

const HOME = 'home'

/** Reserved row that stores which storefront design is active. */
export const DESIGN_KEY = 'site:design'

/** Full row (draft + published) — used by the editor to seed its state. */
export async function getSitePageRow(
  key: string = HOME,
  timeoutMs?: number
): Promise<SitePageRow | null> {
  try {
    const rows = await withDb(
      () => db.select().from(sitePages).where(eq(sitePages.key, key)).limit(1),
      timeoutMs
    )
    return rows[0] ?? null
  } catch {
    // Table may not exist yet (first boot before ensure-schema), or the link
    // is down and the breaker rejected us. Fail soft — callers all have a
    // sensible default and getPublishedDesign() keeps the last known skin.
    return null
  }
}

/**
 * Cached row read for VISITOR-facing lookups (published design, theme, hero,
 * published docs). The editor keeps using getSitePageRow directly so drafts
 * are always fresh. Admin publish/save actions call bustDataCache().
 * `cacheEmpty` because "no row yet" is a legit steady state for most keys.
 */
function getSitePageRowCached(key: string): Promise<SitePageRow | null> {
  return cachedData(`sitePage:${key}`, () => getSitePageRow(key), {
    cacheEmpty: true,
  })
}

const HERO_KEY = 'home-hero'

/** Published homepage hero config, or null (homepage uses default slider). */
export async function getHomeHero(): Promise<HeroConfig | null> {
  const row = await getSitePageRowCached(HERO_KEY)
  if (!row?.published) return null
  return sanitizeHeroConfig(row.published)
}

/**
 * Contenu publié d'une page, réduit à ce que les peaux lisent encore.
 *
 * L'ancien éditeur stockait ici tout un document (textes réécrits, retouches
 * de style, ordre et masquage des sections, blocs personnalisés). Ces champs
 * n'ont plus de moteur pour les appliquer — les enveloppes de
 * `site-edit/edit-context` sont inertes — et sont donc ignorés à la lecture.
 * Seul `theme` survit : il pilote encore le thème du site.
 */
function coerceContent(src: unknown): EditData {
  const o = (src ?? {}) as { theme?: unknown }
  return {
    theme: typeof o.theme === 'string' ? o.theme : undefined,
  }
}

/** Inline content published for a real page (live site reads this). */
export async function getPublishedContent(pageKey: string): Promise<EditData> {
  const row = await getSitePageRowCached(`content:${pageKey}`)
  return coerceContent(row?.published)
}

/**
 * The site-wide theme id (e.g. 'nightline', 'mediterranean'). Driven by the
 * published home content theme so it applies across all pages and locales.
 * Falls back to the default 'nightline'.
 */
export async function getSiteTheme(): Promise<string> {
  try {
    const row = await getSitePageRowCached('content:home')
    const t = coerceContent(row?.published).theme
    return t && typeof t === 'string' ? t : 'nightline'
  } catch {
    return 'nightline'
  }
}

/**
 * Which storefront design is LIVE for visitors ('classic' | 'brand' |
 * 'editorial'). All three share the same data/backend — only the interface
 * differs. Falls back to the current design until a choice is published.
 *
 * Deliberately NOT behind the 60 s TTL cache. Every other visitor read
 * tolerates a minute of staleness; this one decides which SKIN the whole site
 * renders in. With the TTL, "Mettre en ligne" could look broken for up to a
 * minute locally, and on Vercel every OTHER warm lambda instance kept serving
 * the old skin until its own copy expired (bustDataCache only clears the
 * instance that handled the admin request). React `cache()` still collapses it
 * to ONE indexed single-row lookup per request, and every storefront route is
 * force-dynamic anyway — so the cost is noise and the switch is instant
 * everywhere.
 */
/**
 * Last design we successfully read, kept for the lifetime of the process.
 *
 * getSitePageRow() fails soft to `null`, and `coerceDesign(null)` is
 * 'classic'. That meant a single dropped connection silently re-skinned the
 * WHOLE site to the default for that render — the live design flipping
 * under you mid-session was a symptom of the link, not of the editor.
 * A remembered value makes an outage invisible instead of visible-and-wrong.
 */
const lastKnownDesign = globalThis as unknown as { __dtechDesign?: DesignId }

/**
 * Ceiling for the design lookup specifically.
 *
 * This one read is deliberately NOT cached (a skin switch must be instant
 * everywhere), which makes it the only DB call a storefront render can block
 * on. It is a single primary-key row: on a healthy link it answers in
 * milliseconds, so anything past 1.5s means the link is sick and the
 * remembered skin is the better answer. Without this ceiling every render
 * during an outage paid the full generic deadline before the breaker opened.
 */
const DESIGN_READ_TIMEOUT_MS = Number(process.env.DB_DESIGN_TIMEOUT_MS ?? 1_500)

export const getPublishedDesign = cache(async (): Promise<DesignId> => {
  const row = await getSitePageRow(DESIGN_KEY, DESIGN_READ_TIMEOUT_MS)
  if (row) {
    const design = coerceDesign(row.published)
    lastKnownDesign.__dtechDesign = design
    return design
  }
  return lastKnownDesign.__dtechDesign ?? coerceDesign(undefined)
})

/**
 * The staged design choice the admin is previewing (draft). Falls back to the
 * published value, then to the current design.
 */
export async function getDraftDesign(): Promise<DesignId> {
  try {
    const row = await getSitePageRow(DESIGN_KEY)
    return coerceDesign(row?.draft ?? row?.published)
  } catch {
    return coerceDesign(undefined)
  }
}
