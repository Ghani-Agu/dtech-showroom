import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { SkinShell } from '@/components/skin/SkinShell'
import { EdLegalBody } from '@/components/editorial/EdLegalBody'
import { getPublishedContent, getPublishedDesign } from '@/server/editor-page-data'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'

/**
 * ISR, not `force-dynamic`.
 *
 * This page reads nothing request-specific — no cookies, no session, no
 * searchParams — so rendering it per visitor meant every single visit paid a
 * round trip from the Vercel function to Postgres before a byte reached the
 * browser. Prerendered and revalidated, Vercel answers from the edge cache
 * closest to the visitor and the database is touched only when the content
 * actually changes. `revalidate` is the safety net; the real freshness comes
 * from revalidateStorefront() in every admin mutation (src/lib/revalidate.ts).
 *
 * setRequestLocale() is what MAKES this possible: without it next-intl reads
 * the locale from request headers, which silently opts the route back into
 * dynamic rendering.
 */
export const revalidate = 300

interface LocaleParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('legal')
  return {
    title: t('pageTitle'),
    description: t('mentionsBody'),
  }
}

export default async function LegalPage({ params }: LocaleParams) {
  const { locale: routeLocale } = await params
  setRequestLocale(routeLocale)
  const locale = await getLocale()
  const design = await getPublishedDesign()
  const content = await getPublishedContent('page:legal')

  /* Le balisage vit dans EdLegalBody : l'aperçu de l'éditeur monte EXACTEMENT
     le même composant (voir src/server/ed-page-body.tsx), donc la page réglée
     dans l'éditeur et la page servie au visiteur ne peuvent plus diverger. */
  const body = <EdLegalBody content={content} />

  /* En peau éditoriale seulement, la page passe par son document : l'auteur
     peut poser des sections autour du texte légal, qui reste injecté tel quel.
     Les deux autres peaux gardent `SkinShell` — rien ne change pour elles. */
  if (design === 'editorial') {
    const [doc, site] = await Promise.all([getEdDoc('legal'), getEdSite()])
    return (
      <EdSkinPage
        locale={locale}
        pageKey="legal"
        doc={doc}
        site={site}
        slots={{ body }}
      />
    )
  }

  return <SkinShell locale={locale}>{body}</SkinShell>
}
