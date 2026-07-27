import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { cachedData } from '@/lib/data-cache'
import { db } from '@/db/client'
import { withDb } from '@/db/health'
import { sitePages, type SitePageRow } from '@/db/schema'
import {
  customKeyForPath,
  type CustomPageMeta,
} from '@/components/admin/editor/site-pages'
import {
  sanitizeHeroConfig,
  type HeroConfig,
} from '@/components/home/hero-config'
import type { EditData } from '@/components/site-edit/edit-context'
import { coerceDesign, type DesignId } from '@/lib/site-design'

const HOME = 'home'

/** Reserved row that stores which storefront design is active. */
export const DESIGN_KEY = 'site:design'
/** Reserved row that stores the list of user-created custom pages. */
export const MANIFEST_KEY = '__pages__'

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

/** The published document a given page key should render, or null. */
export async function getPublishedPage(
  key: string
): Promise<Record<string, unknown> | null> {
  const row = await getSitePageRowCached(key)
  const published = row?.published
  if (published && typeof published === 'object') {
    return published as Record<string, unknown>
  }
  return null
}

/** Back-compat helper — the homepage published doc, or null. */
export async function getPublishedHome(): Promise<Record<
  string,
  unknown
> | null> {
  return getPublishedPage(HOME)
}

/** The list of custom pages from the manifest row. */
export async function getCustomPages(): Promise<CustomPageMeta[]> {
  const row = await getSitePageRowCached(MANIFEST_KEY)
  const data = row?.draft as { pages?: CustomPageMeta[] } | null
  return Array.isArray(data?.pages) ? (data.pages as CustomPageMeta[]) : []
}

/**
 * Published custom-page doc for a request path (e.g. '/promo'), or null.
 * Used by the catch-all route so any published custom page renders live.
 */
export async function getPublishedCustomByPath(
  path: string
): Promise<Record<string, unknown> | null> {
  return getPublishedPage(customKeyForPath(path))
}

/** Per-key publish/draft state — used by the editor page navigator. */
export interface PageState {
  key: string
  hasDraft: boolean
  published: boolean
}

export async function listPageStates(keys: string[]): Promise<PageState[]> {
  const out: PageState[] = []
  for (const key of keys) {
    const row = await getSitePageRow(key)
    out.push({
      key,
      hasDraft: !!row?.draft,
      published: !!row?.published,
    })
  }
  return out
}


const HERO_KEY = 'home-hero'

/** Published homepage hero config, or null (homepage uses default slider). */
export async function getHomeHero(): Promise<HeroConfig | null> {
  const row = await getSitePageRowCached(HERO_KEY)
  if (!row?.published) return null
  return sanitizeHeroConfig(row.published)
}

/** Draft-or-published hero config for the editor (draft wins). */
export async function getHomeHeroForEditor(): Promise<HeroConfig | null> {
  const row = await getSitePageRow(HERO_KEY)
  const src = row?.draft ?? row?.published
  return src ? sanitizeHeroConfig(src) : null
}


function coerceContent(src: unknown): EditData {
  const o = (src ?? {}) as { overrides?: unknown; styles?: unknown }
  const sec = (o as { sections?: { order?: unknown; hidden?: unknown } }).sections
  return {
    overrides: (o.overrides && typeof o.overrides === 'object') ? (o.overrides as Record<string, string>) : {},
    styles: (o.styles && typeof o.styles === 'object') ? (o.styles as EditData['styles']) : {},
    sections: {
      order: Array.isArray(sec?.order) ? (sec!.order as string[]) : [],
      hidden: Array.isArray(sec?.hidden) ? (sec!.hidden as string[]) : [],
    },
    sectionBg: ((o as { sectionBg?: unknown }).sectionBg && typeof (o as { sectionBg?: unknown }).sectionBg === 'object')
      ? ((o as { sectionBg: Record<string, string> }).sectionBg)
      : {},
    sectionStyles: ((o as { sectionStyles?: unknown }).sectionStyles && typeof (o as { sectionStyles?: unknown }).sectionStyles === 'object')
      ? ((o as { sectionStyles: EditData['sectionStyles'] }).sectionStyles)
      : {},
    customSections: Array.isArray((o as { customSections?: unknown }).customSections)
      ? ((o as { customSections: EditData['customSections'] }).customSections)
      : [],
    sectionBlocks: ((o as { sectionBlocks?: unknown }).sectionBlocks && typeof (o as { sectionBlocks?: unknown }).sectionBlocks === 'object')
      ? ((o as { sectionBlocks: EditData['sectionBlocks'] }).sectionBlocks)
      : {},
    theme: typeof (o as { theme?: unknown }).theme === 'string' ? ((o as { theme: string }).theme) : undefined,
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

/** Draft content for the editor (draft wins, else published, else empty). */
export async function getContentDraft(pageKey: string): Promise<EditData> {
  const row = await getSitePageRow(`content:${pageKey}`)
  return coerceContent(row?.draft ?? row?.published)
}
