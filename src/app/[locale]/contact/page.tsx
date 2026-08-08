import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { edT, type EdLang } from '@/components/editorial/editorial-i18n'

/**
 * ROUND 19 — /contact, a real page instead of an #anchor on /about.
 *
 * ISR: the address, hours and phone numbers are constants, and the form is a
 * client island posting to a server action, so nothing here is per-request.
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
    title: `${edT(l, 'ct.eyebrow')} — D-tech`,
    description: edT(l, 'ct.lede'),
  }
}

export default async function ContactPage({ params }: LocaleParams) {
  const { locale } = await params
  setRequestLocale(locale)

  const design = await getPublishedDesign()
  // The other two skins keep their contact block inside /about.
  if (design !== 'editorial') redirect(`/${locale}/about#contact`)

  /* Aucune donnée : les sections de contact (canaux, adresse, carte,
     formulaire) sont autonomes, le document suffit. */
  const [doc, site] = await Promise.all([getEdDoc('contact'), getEdSite()])

  return <EdSkinPage locale={locale} pageKey="contact" doc={doc} site={site} />
}
