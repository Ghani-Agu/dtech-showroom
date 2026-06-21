'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { sitePages } from '@/db/schema'
import {
  customKeyForPath,
  normalizePath,
  pathConflicts,
  type CustomPageMeta,
} from '@/components/admin/editor/site-pages'
import {
  getCustomPages,
  getSitePageRow,
  MANIFEST_KEY,
} from '@/server/editor-page-data'

export interface PageActionResult {
  ok: boolean
  error?: string
}

const HOME = 'home'

/** A minimally-validated editor document (we store it as JSON). */
function isValidDoc(doc: unknown): doc is Record<string, unknown> {
  return (
    !!doc &&
    typeof doc === 'object' &&
    Array.isArray((doc as { blocks?: unknown }).blocks)
  )
}

function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && key.length < 200
}

async function requireSession(): Promise<boolean> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  return !!session
}

/** Flush cached routes after a publish/unpublish (pages are force-dynamic). */
function flush() {
  revalidatePath('/', 'layout')
}

/** Autosave the working draft for a page (private — visitors never see it). */
export async function saveDraft(
  key: string,
  doc: unknown
): Promise<PageActionResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  if (!isValidKey(key)) return { ok: false, error: 'Clé de page invalide' }
  if (!isValidDoc(doc)) return { ok: false, error: 'Document invalide' }

  await db
    .insert(sitePages)
    .values({ key, draft: doc, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: sitePages.key,
      set: { draft: doc, updatedAt: new Date() },
    })

  return { ok: true }
}

/** Publish: the draft becomes what the page's public route renders. */
export async function publishPage(
  key: string,
  doc: unknown
): Promise<PageActionResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  if (!isValidKey(key)) return { ok: false, error: 'Clé de page invalide' }
  if (!isValidDoc(doc)) return { ok: false, error: 'Document invalide' }

  const now = new Date()
  await db
    .insert(sitePages)
    .values({
      key,
      draft: doc,
      published: doc,
      updatedAt: now,
      publishedAt: now,
    })
    .onConflictDoUpdate({
      target: sitePages.key,
      set: { draft: doc, published: doc, updatedAt: now, publishedAt: now },
    })

  flush()
  return { ok: true }
}

/** Unpublish: the page's public route reverts to its built-in default. */
export async function unpublishPage(key: string): Promise<PageActionResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  if (!isValidKey(key)) return { ok: false, error: 'Clé de page invalide' }

  await db
    .update(sitePages)
    .set({ published: null, publishedAt: null, updatedAt: new Date() })
    .where(eq(sitePages.key, key))

  flush()
  return { ok: true }
}

/** Apply a theme to a saved page (draft + the live published copy too). */
export async function setDocTheme(
  key: string,
  themeId: string
): Promise<PageActionResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  if (!isValidKey(key)) return { ok: false, error: 'Clé de page invalide' }
  if (typeof themeId !== 'string' || !themeId)
    return { ok: false, error: 'Thème invalide' }

  const row = await getSitePageRow(key)
  if (!row || (!row.draft && !row.published)) {
    return { ok: false, error: 'Aucune page enregistrée — ouvrez d’abord l’éditeur.' }
  }

  const draft = row.draft as Record<string, unknown> | null
  const published = row.published as Record<string, unknown> | null
  const nextDraft = draft ? { ...draft, theme: themeId } : draft
  const nextPublished = published ? { ...published, theme: themeId } : published
  const now = new Date()

  await db
    .update(sitePages)
    .set({ draft: nextDraft, published: nextPublished, updatedAt: now })
    .where(eq(sitePages.key, key))

  if (nextPublished) flush()
  return { ok: true }
}

// ───────────────────────── custom pages ─────────────────────────

export interface CreatePageResult extends PageActionResult {
  key?: string
  path?: string
}

/** Create a new custom page at an arbitrary URL path. */
export async function createCustomPage(input: {
  path: string
  title: string
}): Promise<CreatePageResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  const path = normalizePath(input?.path ?? '')
  if (path === '/' || path.length < 2) {
    return { ok: false, error: 'Adresse invalide.' }
  }
  if (pathConflicts(path)) {
    return { ok: false, error: 'Cette adresse est réservée par le site.' }
  }
  const title = (input?.title || path).trim().slice(0, 80)
  const key = customKeyForPath(path)

  const customs = await getCustomPages()
  if (customs.some((c) => c.key === key)) {
    return { ok: false, error: 'Une page existe déjà à cette adresse.' }
  }
  const next: CustomPageMeta[] = [...customs, { key, title, path }]
  const now = new Date()
  await db
    .insert(sitePages)
    .values({ key: MANIFEST_KEY, draft: { pages: next }, updatedAt: now })
    .onConflictDoUpdate({
      target: sitePages.key,
      set: { draft: { pages: next }, updatedAt: now },
    })

  return { ok: true, key, path }
}

/** Remove a custom page from the manifest and clear its content. */
export async function deleteCustomPage(key: string): Promise<PageActionResult> {
  if (!(await requireSession())) return { ok: false, error: 'Non connecté' }
  if (!isValidKey(key) || !key.startsWith('custom:')) {
    return { ok: false, error: 'Seules les pages personnalisées peuvent être supprimées.' }
  }
  const customs = await getCustomPages()
  const next = customs.filter((c) => c.key !== key)
  const now = new Date()
  await db
    .insert(sitePages)
    .values({ key: MANIFEST_KEY, draft: { pages: next }, updatedAt: now })
    .onConflictDoUpdate({
      target: sitePages.key,
      set: { draft: { pages: next }, updatedAt: now },
    })
  // Clear the page's own content so it stops resolving.
  await db
    .update(sitePages)
    .set({ draft: null, published: null, publishedAt: null, updatedAt: now })
    .where(eq(sitePages.key, key))

  flush()
  return { ok: true }
}
