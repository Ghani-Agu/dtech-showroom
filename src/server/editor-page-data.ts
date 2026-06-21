import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
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

const HOME = 'home'
/** Reserved row that stores the list of user-created custom pages. */
export const MANIFEST_KEY = '__pages__'

/** Full row (draft + published) — used by the editor to seed its state. */
export async function getSitePageRow(
  key: string = HOME
): Promise<SitePageRow | null> {
  try {
    const rows = await db
      .select()
      .from(sitePages)
      .where(eq(sitePages.key, key))
      .limit(1)
    return rows[0] ?? null
  } catch {
    // Table may not exist yet (first boot before ensure-schema). Fail soft.
    return null
  }
}

/** The published document a given page key should render, or null. */
export async function getPublishedPage(
  key: string
): Promise<Record<string, unknown> | null> {
  const row = await getSitePageRow(key)
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
  const row = await getSitePageRow(MANIFEST_KEY)
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
  const row = await getSitePageRow(HERO_KEY)
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
    theme: typeof (o as { theme?: unknown }).theme === 'string' ? ((o as { theme: string }).theme) : undefined,
  }
}

/** Inline content published for a real page (live site reads this). */
export async function getPublishedContent(pageKey: string): Promise<EditData> {
  const row = await getSitePageRow(`content:${pageKey}`)
  return coerceContent(row?.published)
}

/**
 * The site-wide theme id (e.g. 'nightline', 'mediterranean'). Driven by the
 * published home content theme so it applies across all pages and locales.
 * Falls back to the default 'nightline'.
 */
export async function getSiteTheme(): Promise<string> {
  try {
    const row = await getSitePageRow('content:home')
    const t = coerceContent(row?.published).theme
    return t && typeof t === 'string' ? t : 'nightline'
  } catch {
    return 'nightline'
  }
}

/** Draft content for the editor (draft wins, else published, else empty). */
export async function getContentDraft(pageKey: string): Promise<EditData> {
  const row = await getSitePageRow(`content:${pageKey}`)
  return coerceContent(row?.draft ?? row?.published)
}
