import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getEdCustomPages, getEdDoc, getEdSite } from '@/server/ed-doc'
import { normalizePath, type EdCustomPage } from '@/lib/ed-editor/pages'
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

/** See the product route: [] + dynamicParams = generate on demand, then cache. */
export function generateStaticParams(): { slug: string[] }[] {
  return []
}

interface CustomPageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

/**
 * Le chemin demandé, passé par la MÊME normalisation que celle appliquée à la
 * création de la page. Sans elle, `/Promo/` et `/promo` ne se ressembleraient
 * pas et une page parfaitement publiée renverrait un 404.
 */
function pathFromSlug(slug: string[] | undefined): string {
  return normalizePath('/' + (slug ?? []).join('/'))
}

/** La page personnalisée servie à ce chemin, ou `null`. */
async function matchCustomPage(
  slug: string[] | undefined
): Promise<EdCustomPage | null> {
  const path = pathFromSlug(slug)
  const pages = await getEdCustomPages()
  return pages.find((p) => p.path === path) ?? null
}

/**
 * Attrape-tout des pages PERSONNALISÉES créées dans l'éditeur. Les routes
 * explicites (products, categories, about…) sont prioritaires ; tout le reste
 * arrive ici, et ne rend une page que si le manifeste la connaît.
 */
export async function generateMetadata({
  params,
}: CustomPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const page = await matchCustomPage(slug)
  if (!page) return {}
  return { title: page.title }
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [design, page] = await Promise.all([getPublishedDesign(), matchCustomPage(slug)])

  /**
   * Chemin inconnu → 404, évidemment. Mais AUSSI quand la peau en ligne n'est
   * pas l'éditoriale : les pages personnalisées sont une fonction de cette
   * peau-là, et leurs sections n'ont de sens que dans son enveloppe. Servir un
   * document éditorial sous le chrome classique donnerait une page à moitié
   * peinte — un 404 honnête vaut mieux.
   */
  if (!page || design !== 'editorial') notFound()

  const [doc, site] = await Promise.all([getEdDoc(page.key), getEdSite()])

  return <EdSkinPage locale={locale} pageKey={page.key} doc={doc} site={site} />
}
