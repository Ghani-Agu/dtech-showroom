import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getAllProducts } from '@/server/queries'
import { buildGamingData } from '@/server/gaming-data'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EdGamingPage } from '@/components/editorial/EdGamingPage'
import { edT, type EdLang } from '@/components/editorial/editorial-i18n'
import { alternatesFor, openGraphFor } from '@/lib/seo'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config'

/**
 * ROUND 19 (phase C) — /gaming, replacing phase A's redirect stub.
 *
 * ISR like the rest of the storefront. The gaming classification is pure
 * (no request input), so this prerenders and revalidates with everything
 * else — see `ed-families.ts` for what counts as gaming and why `monitors`
 * is conditional.
 */
export const revalidate = 300

interface LocaleParams {
  params: Promise<{ locale: string }>
}

function lang(locale: string): EdLang {
  return locale === 'en' || locale === 'ar' ? locale : 'fr'
}
function loc(locale: string): Locale {
  return isValidLocale(locale) ? locale : defaultLocale
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const l = lang(locale)
  const title = `${edT(l, 'gm.t1')} ${edT(l, 'gm.t2')} — D-tech Gaming`
  const description = edT(l, 'gm.lede')
  return {
    title,
    description,
    alternates: alternatesFor(locale, '/gaming'),
    openGraph: openGraphFor(loc(locale), '/gaming', title, description),
  }
}

export default async function GamingPage({ params }: LocaleParams) {
  const { locale } = await params
  setRequestLocale(locale)

  const design = await getPublishedDesign()
  // The other two skins have no gaming surface — send them to the closest
  // honest destination rather than rendering an unstyled page.
  if (design !== 'editorial') redirect(`/${locale}/products?category=gaming`)

  const products = await getAllProducts(loc(locale))

  /* `getAllProducts` swallows a DB error into `[]` (see queries.ts `safe()`).
     With revalidate=300 that empty result would be WRITTEN to the ISR cache
     and served for five minutes after the database recovered. Throwing keeps
     Next serving the last good render instead. Same guard as the homepage. */
  if (products.length === 0 && process.env.ALLOW_EMPTY_CATALOGUE !== '1') {
    throw new Error('Gaming page: empty catalogue — refusing to cache a hollow page.')
  }

  const data = buildGamingData(products)

  return (
    <EditorialPageShell locale={locale}>
      <EdGamingPage data={data} />
    </EditorialPageShell>
  )
}
