'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sitePages } from '@/db/schema'
import { requireSection } from '@/lib/auth-helpers'

/**
 * Inline-content for a real site page (beyond-Shopify on-page editing).
 * Stored in `site_pages` under key `content:<pageKey>` as
 * `{ overrides: { id: text|json }, styles: { id: StylePatch } }`.
 * `draft` = what the editor shows; `published` = what visitors see.
 */
export interface ContentResult {
  ok: boolean
  error?: string
}

export interface StylePatch {
  color?: string
  fontSize?: number
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
  letterSpacing?: number
  textTransform?: 'none' | 'uppercase'
  fontStyle?: 'normal' | 'italic'
  lineHeight?: number
  radius?: number
  background?: string
  paddingY?: number
  paddingX?: number
}

export interface SectionConfig {
  order: string[]
  hidden: string[]
}

export interface SectionStyle {
  bgColor?: string
  textColor?: string
  padTop?: number
  padBottom?: number
  padX?: number
  minHeight?: number
  radius?: number
  borderWidth?: number
  borderColor?: string
  shadow?: boolean
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
}

export interface EditBlock {
  id: string
  kind: string
}

export interface CustomSection {
  id: string
  type: string
  layout?: string
  blocks?: EditBlock[]
}

export interface EditData {
  overrides: Record<string, string>
  styles: Record<string, StylePatch>
  sections: SectionConfig
  sectionBg: Record<string, string>
  sectionStyles: Record<string, SectionStyle>
  customSections: CustomSection[]
  /** Extra blocks appended into a section (real coded sections included), keyed by section id. */
  sectionBlocks?: Record<string, EditBlock[]>
  theme?: string
}

const KEY = (pageKey: string) => `content:${pageKey}`

function sanitizeOverrides(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === 'string' && k.length < 200 && typeof v === 'string') {
      out[k] = v.slice(0, 8000)
    }
  }
  return out
}

function sanitizeStyles(input: unknown): Record<string, StylePatch> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, StylePatch> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length >= 200 || !v || typeof v !== 'object') continue
    const o = v as Record<string, unknown>
    const p: StylePatch = {}
    if (typeof o.color === 'string') p.color = o.color.slice(0, 64)
    if (typeof o.background === 'string') p.background = o.background.slice(0, 200)
    if (typeof o.fontSize === 'number' && o.fontSize > 0 && o.fontSize < 400) p.fontSize = o.fontSize
    if (typeof o.fontWeight === 'number') p.fontWeight = o.fontWeight
    if (o.textAlign === 'left' || o.textAlign === 'center' || o.textAlign === 'right') p.textAlign = o.textAlign
    if (typeof o.letterSpacing === 'number') p.letterSpacing = o.letterSpacing
    if (o.textTransform === 'none' || o.textTransform === 'uppercase') p.textTransform = o.textTransform
    if (o.fontStyle === 'normal' || o.fontStyle === 'italic') p.fontStyle = o.fontStyle
    if (typeof o.lineHeight === 'number' && o.lineHeight >= 0.5 && o.lineHeight < 4) p.lineHeight = o.lineHeight
    if (typeof o.radius === 'number' && o.radius >= 0 && o.radius < 400) p.radius = o.radius
    if (typeof o.paddingY === 'number' && o.paddingY >= 0 && o.paddingY < 600) p.paddingY = o.paddingY
    if (typeof o.paddingX === 'number' && o.paddingX >= 0 && o.paddingX < 600) p.paddingX = o.paddingX
    if (Object.keys(p).length) out[k] = p
  }
  return out
}

function sanitizeSections(input: unknown): SectionConfig {
  const o = (input ?? {}) as { order?: unknown; hidden?: unknown }
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 60) : []
  return { order: arr(o.order), hidden: arr(o.hidden) }
}

const LAYOUTS = new Set(['stack', 'center', 'cols2', 'cols3', 'row'])
const ALIGNS = new Set(['left', 'center', 'right'])

function sanitizeSectionStyles(input: unknown): Record<string, SectionStyle> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, SectionStyle> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length >= 200 || !v || typeof v !== 'object') continue
    const o = v as Record<string, unknown>
    const p: SectionStyle = {}
    if (typeof o.bgColor === 'string') p.bgColor = o.bgColor.slice(0, 200)
    if (typeof o.textColor === 'string') p.textColor = o.textColor.slice(0, 64)
    if (typeof o.padTop === 'number' && o.padTop >= 0 && o.padTop < 600) p.padTop = o.padTop
    if (typeof o.padBottom === 'number' && o.padBottom >= 0 && o.padBottom < 600) p.padBottom = o.padBottom
    if (typeof o.maxWidth === 'number' && o.maxWidth >= 200 && o.maxWidth < 2400) p.maxWidth = o.maxWidth
    if (typeof o.align === 'string' && ALIGNS.has(o.align)) p.align = o.align as SectionStyle['align']
    if (typeof o.padX === 'number' && o.padX >= 0 && o.padX < 600) p.padX = o.padX
    if (typeof o.minHeight === 'number' && o.minHeight >= 0 && o.minHeight < 4000) p.minHeight = o.minHeight
    if (typeof o.radius === 'number' && o.radius >= 0 && o.radius < 400) p.radius = o.radius
    if (typeof o.borderWidth === 'number' && o.borderWidth >= 0 && o.borderWidth < 60) p.borderWidth = o.borderWidth
    if (typeof o.borderColor === 'string') p.borderColor = o.borderColor.slice(0, 64)
    if (typeof o.shadow === 'boolean') p.shadow = o.shadow
    if (Object.keys(p).length) out[k] = p
  }
  return out
}

function sanitizeBlocks(input: unknown): EditBlock[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (b): b is { id: string; kind: string } =>
        !!b &&
        typeof b === 'object' &&
        typeof (b as { id?: unknown }).id === 'string' &&
        typeof (b as { kind?: unknown }).kind === 'string'
    )
    .map((b) => ({ id: String(b.id).slice(0, 80), kind: String(b.kind).slice(0, 40) }))
    .slice(0, 60)
}

function sanitizeSectionBlocks(input: unknown): Record<string, EditBlock[]> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, EditBlock[]> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length >= 200) continue
    const blocks = sanitizeBlocks(v)
    if (blocks.length) out[k] = blocks
  }
  return out
}

function sanitizeCustomSections(input: unknown): CustomSection[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (x): x is Record<string, unknown> =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as { id?: unknown }).id === 'string' &&
        typeof (x as { type?: unknown }).type === 'string'
    )
    .map((x) => {
      const cs: CustomSection = { id: String(x.id), type: String(x.type) }
      if (typeof x.layout === 'string' && LAYOUTS.has(x.layout)) cs.layout = x.layout
      const blocks = sanitizeBlocks(x.blocks)
      if (blocks.length) cs.blocks = blocks
      return cs
    })
    .slice(0, 50)
}

function sanitize(input: unknown): EditData {
  const o = (input ?? {}) as Record<string, unknown>
  const out: EditData = {
    overrides: sanitizeOverrides(o.overrides),
    styles: sanitizeStyles(o.styles),
    sections: sanitizeSections(o.sections),
    sectionBg: sanitizeOverrides(o.sectionBg),
    sectionStyles: sanitizeSectionStyles(o.sectionStyles),
    customSections: sanitizeCustomSections(o.customSections),
    sectionBlocks: sanitizeSectionBlocks(o.sectionBlocks),
  }
  if (typeof o.theme === 'string' && o.theme.length < 40) out.theme = o.theme
  return out
}

/**
 * Apply a site theme. The theme is stored ON the page content (draft +
 * published) so it rides the same store the live site reads, and goes live
 * immediately (matches the "Appliquer" expectation). Preserves all other
 * content. Revalidates so /fr and /ar re-render in the chosen theme.
 */
export async function setContentTheme(pageKey: string, themeId: string): Promise<ContentResult> {
  try {
    await requireSection('editor')
    if (typeof pageKey !== 'string' || !pageKey) return { ok: false, error: 'Clé de page invalide' }
    if (typeof themeId !== 'string' || !themeId || themeId.length >= 40) return { ok: false, error: 'Thème invalide' }
    const rows = await db.select().from(sitePages).where(eq(sitePages.key, KEY(pageKey))).limit(1)
    const existing = rows[0]
    const draft: EditData = { ...sanitize(existing?.draft ?? {}), theme: themeId }
    const published: EditData = { ...sanitize(existing?.published ?? existing?.draft ?? {}), theme: themeId }
    const now = new Date()
    await db
      .insert(sitePages)
      .values({ key: KEY(pageKey), draft, published, updatedAt: now, publishedAt: now })
      .onConflictDoUpdate({ target: sitePages.key, set: { draft, published, updatedAt: now, publishedAt: now } })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

export async function saveContentDraft(pageKey: string, data: unknown): Promise<ContentResult> {
  try {
    await requireSection('editor')
    if (typeof pageKey !== 'string' || !pageKey) return { ok: false, error: 'Clé de page invalide' }
    const clean = sanitize(data)
    await db
      .insert(sitePages)
      .values({ key: KEY(pageKey), draft: clean, updatedAt: new Date() })
      .onConflictDoUpdate({ target: sitePages.key, set: { draft: clean, updatedAt: new Date() } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

export async function publishContent(pageKey: string, data: unknown): Promise<ContentResult> {
  try {
    await requireSection('editor')
    if (typeof pageKey !== 'string' || !pageKey) return { ok: false, error: 'Clé de page invalide' }
    const clean = sanitize(data)
    const now = new Date()
    await db
      .insert(sitePages)
      .values({ key: KEY(pageKey), draft: clean, published: clean, updatedAt: now, publishedAt: now })
      .onConflictDoUpdate({
        target: sitePages.key,
        set: { draft: clean, published: clean, updatedAt: now, publishedAt: now },
      })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

export async function resetContent(pageKey: string): Promise<ContentResult> {
  try {
    await requireSection('editor')
    await db
      .update(sitePages)
      .set({ published: null, publishedAt: null, draft: null, updatedAt: new Date() })
      .where(eq(sitePages.key, KEY(pageKey)))
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}
