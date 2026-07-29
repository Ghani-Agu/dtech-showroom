import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getNavData } from '@/server/nav-data'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EdCataloguePage } from '@/components/editorial/EdCataloguePage'
import { edT, type EdLang } from '@/components/editorial/editorial-i18n'

/**
 * ROUND 19 — /catalogue: browse the catalogue by family.
 *
 * ISR like every other content route. It reads nothing request-specific, so
 * `setRequestLocale` + `revalidate` keep it on the edge cache; see the note in
 * about/page.tsx for why setRequestLocale is what actually makes that work.
 *
 * Only the editorial skin has this surface. The other two skins already treat
 * /products as their single catalogue, so they redirect there rather than
 * rendering a half-designed duplicate.
 */
export const revalidate = 300

interface LocaleParams {
  params: Promise<{ locale: string }>
}

function lang(locale: string): EdLang {
  return locale === 'en' || locale === 'ar' ? locale : 'fr'
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const l = lang(locale)
  return {
    title: `${edT(l, 'cpage.eyebrow')} — D-tech`,
    description: edT(l, 'cpage.lede'),
  }
}

export default async function CataloguePage({ params }: LocaleParams) {
  const { locale } = await params
  setRequestLocale(locale)

  const design = await getPublishedDesign()
  if (design !== 'editorial') redirect(`/${locale}/products`)

  const nav = await getNavData(locale)

  return (
    <EditorialPageShell locale={locale}>
      <EdCataloguePage cats={nav.cats} productCount={nav.productCount} />
    </EditorialPageShell>
  )
}
