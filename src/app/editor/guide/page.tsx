import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSitePageRow } from '@/server/editor-page-data'
import { GuideBook } from '@/components/admin/editor/GuideBook'
import { getTheme } from '@/components/admin/editor/themes'
import type { PageDoc } from '@/components/admin/editor/types'

export const metadata: Metadata = {
  title: 'Guide · Éditeur web · Dtech',
  robots: { index: false, follow: false },
}

export default async function GuidePage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) redirect('/login?redirect=/editor/guide')

  const row = await getSitePageRow()
  const doc = (row?.draft ?? row?.published ?? null) as PageDoc | null
  const current = doc?.theme ?? 'nightline'
  const themeDef = getTheme(current)
  const uiClass = `${themeDef.dark ? '' : 'we-ui-light'} we-accent-${current}`.trim()

  return <GuideBook uiClass={uiClass} />
}
