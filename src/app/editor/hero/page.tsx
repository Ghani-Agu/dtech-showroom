import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getHomeHero, getHomeHeroForEditor } from '@/server/editor-page-data'
import { HeroEditor } from '@/components/admin/editor/HeroEditor'

export const metadata: Metadata = {
  title: 'Hero d’accueil · Éditeur web · Dtech',
  robots: { index: false, follow: false },
}

export default async function HeroEditorPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) redirect('/login?redirect=/editor/hero')

  const [initial, published] = await Promise.all([
    getHomeHeroForEditor(),
    getHomeHero(),
  ])

  return (
    <HeroEditor
      initial={initial}
      initiallyPublished={!!published}
      uiClass="we-ui-light we-accent-nightline"
    />
  )
}
