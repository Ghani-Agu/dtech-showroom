import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSitePageRow, getContentDraft } from '@/server/editor-page-data'
import { ThemeLibrary } from '@/components/admin/editor/ThemeLibrary'
import { getTheme } from '@/components/admin/editor/themes'
import type { PageDoc } from '@/components/admin/editor/types'

export const metadata: Metadata = {
  title: 'Thèmes · Éditeur web · Dtech',
  robots: { index: false, follow: false },
}

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) redirect('/login?redirect=/editor/themes')

  const sp = await searchParams
  const pageKey = sp?.page || 'home'

  const row = await getSitePageRow(pageKey)
  const doc = (row?.draft ?? row?.published ?? null) as PageDoc | null
  // Theme now lives on the page CONTENT (the same store the live site reads),
  // not the block-doc — so the picker reflects what's actually applied.
  const content = await getContentDraft(pageKey)
  const current = content.theme ?? doc?.theme ?? 'nightline'
  const themeDef = getTheme(current)
  const uiClass = `${themeDef.dark ? '' : 'we-ui-light'} we-accent-${current}`.trim()

  return (
    <ThemeLibrary
      doc={doc}
      pageKey={pageKey}
      initialTheme={current}
      hasSavedPage={!!(row?.draft || row?.published)}
      published={!!row?.published}
      uiClass={uiClass}
    />
  )
}
