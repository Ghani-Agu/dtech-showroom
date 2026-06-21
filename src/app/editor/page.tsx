import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { WebEditor, type PageEntry } from '@/components/admin/editor/WebEditor'
import type { PageDoc } from '@/components/admin/editor/types'
import {
  CANONICAL_PAGES,
  customDef,
  getPageDef,
  mirrorDoc,
} from '@/components/admin/editor/site-pages'
import { DEFAULT_THEME } from '@/components/admin/editor/themes'
import {
  getContentDraft,
  getCustomPages,
  getSitePageRow,
  listPageStates,
} from '@/server/editor-page-data'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Éditeur web · Dtech',
  robots: { index: false, follow: false },
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/editor')
  }

  const sp = await searchParams
  const pageKey = sp?.page || 'home'

  const customs = await getCustomPages()
  const pageDef = getPageDef(pageKey, customs)
  if (!pageDef) {
    // Unknown / removed page — fall back to the homepage.
    redirect('/editor?page=home')
  }

  const row = await getSitePageRow(pageKey)

  // New pages inherit the site's theme (read from the homepage doc) so they
  // match out of the box.
  let seedTheme = DEFAULT_THEME
  const homeRow = pageKey === 'home' ? row : await getSitePageRow('home')
  const homeDoc = (homeRow?.draft ?? homeRow?.published) as PageDoc | null
  if (homeDoc?.theme) seedTheme = homeDoc.theme

  const initialDoc = (row?.draft ??
    row?.published ??
    mirrorDoc(pageKey, { theme: seedTheme, customs })) as PageDoc
  const published = !!row?.published
  const contentDraft = await getContentDraft(pageKey)

  // Build the page navigator list with each page's live/draft state.
  const defs = [...CANONICAL_PAGES, ...customs.map(customDef)]
  const states = await listPageStates(defs.map((d) => d.key))
  const stateByKey = new Map(states.map((s) => [s.key, s] as const))
  const pages: PageEntry[] = defs.map((def) => {
    const st = stateByKey.get(def.key)
    return {
      def,
      published: st?.published ?? false,
      hasDraft: st?.hasDraft ?? false,
    }
  })

  return (
    <WebEditor
      fullScreen
      serverEnabled
      pageKey={pageKey}
      pageDef={pageDef}
      pages={pages}
      initialDoc={initialDoc}
      initiallyPublished={published}
      contentDraft={contentDraft}
    />
  )
}
