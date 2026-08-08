import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getAllBrands, getAllCategories, getAllProducts } from '@/server/queries'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { type EdCompanyData } from '@/components/editorial/EdCompanyPage'
import { ED_OWN_BRANDS } from '@/components/editorial/editorial-types'
import { edT, type EdLang } from '@/components/editorial/editorial-i18n'
import { imgOr } from '@/lib/img'
import { alternatesFor, openGraphFor, organizationLd, jsonLdScript } from '@/lib/seo'
import { POSTAL_ADDRESS } from '@/lib/contact-info'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config'

/**
 * ROUND 19 (phase C) — /company, replacing phase A's redirect stub.
 *
 * The corporate profile for SARL Hardware Technology Service under its D-tech
 * brand. Facts are verified (CACI registry + the company deck) — see the
 * dtech-company-facts memory before editing any figure here.
 */
export const revalidate = 300

/** Company founding year, per the registry. */
const FOUNDED = 2006

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
  const title = `${edT(l, 'co.eyebrow')} — D-tech`
  const description = edT(l, 'co.p3')
  return {
    title,
    description,
    alternates: alternatesFor(locale, '/company'),
    openGraph: openGraphFor(loc(locale), '/company', title, description),
  }
}

export default async function CompanyPage({ params }: LocaleParams) {
  const { locale } = await params
  setRequestLocale(locale)

  const design = await getPublishedDesign()
  if (design !== 'editorial') redirect(`/${locale}/about`)

  const L = loc(locale)
  const [products, brands, categories] = await Promise.all([
    getAllProducts(L),
    getAllBrands(L),
    getAllCategories(L),
  ])

  /* See the note on the gaming page: an empty read is a DB fault, not a real
     empty catalogue, and ISR would freeze it for five minutes. */
  if (products.length === 0 && process.env.ALLOW_EMPTY_CATALOGUE !== '1') {
    throw new Error('Company page: empty catalogue — refusing to cache a hollow page.')
  }

  const countByBrand = new Map<string, number>()
  for (const p of products) {
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }
  const own = new Set<string>(ED_OWN_BRANDS)

  /**
   * Years in business, computed HERE rather than in the component.
   *
   * `new Date()` inside a client component renders once on the server and
   * again on the client; across a New Year boundary (or a revalidation that
   * straddles it) those disagree and React logs a hydration mismatch. Server
   * side it is baked into the ISR output and refreshed with everything else.
   */
  const years = Math.max(1, new Date().getFullYear() - FOUNDED)

  const data: EdCompanyData = {
    years,
    productCount: products.length,
    // DISTRIBUTED brands only. Counting the two house brands here made the
    // headline read "21 marques distribuées" above a wall of 19 tiles, while
    // the next stat separately reported "2 marques propres" — double-counted
    // and visibly contradicted by the page's own content.
    brandCount: brands.filter(
      (b) => (countByBrand.get(b.slug) ?? 0) > 0 && !own.has(b.slug)
    ).length,
    categoryCount: categories.filter((c) =>
      products.some((p) => p.category.slug === c.slug)
    ).length,
    ownBrands: brands
      .filter((b) => own.has(b.slug))
      .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
      .sort(
        (a, b) => ED_OWN_BRANDS.indexOf(a.slug as (typeof ED_OWN_BRANDS)[number]) -
          ED_OWN_BRANDS.indexOf(b.slug as (typeof ED_OWN_BRANDS)[number])
      ),
    // House-brand products: the D-tech line first (it carries the company
    // name), then InkMaster, capped so the section stays a showcase.
    ownProducts: products
      .filter((p) => own.has(p.brand.slug))
      .sort(
        (a, b) =>
          ED_OWN_BRANDS.indexOf(a.brand.slug as (typeof ED_OWN_BRANDS)[number]) -
            ED_OWN_BRANDS.indexOf(b.brand.slug as (typeof ED_OWN_BRANDS)[number]) ||
          Number(b.featured) - Number(a.featured) ||
          a.sortOrder - b.sortOrder
      )
      .slice(0, 8)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        brand: p.brand.name,
        cat: p.category.slug,
        catName: p.category.name,
        spec: p.cardSpec ?? '',
        img: imgOr(p.cardImagePath),
        specs: p.specs,
        featured: p.featured,
      })),
    brands: brands
      .filter((b) => (countByBrand.get(b.slug) ?? 0) > 0 && !own.has(b.slug))
      .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
      .sort((a, b) => b.count - a.count),
  }

  const [doc, site] = await Promise.all([getEdDoc('company'), getEdSite()])

  /* Le JSON-LD sort de l'enveloppe : `EdSkinPage` rend lui-même l'en-tête, le
     <main> et le pied de page, et un <script> n'a de toute façon rien à faire
     dans le corps de la page. Le balisage émis, lui, est inchangé. */
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            organizationLd(),
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'SARL Hardware Technology Service',
              alternateName: 'D-tech Algérie',
              foundingDate: String(FOUNDED),
              founder: { '@type': 'Person', name: 'Faycal BOUNAR' },
              address: POSTAL_ADDRESS,
            },
          ]),
        }}
      />
      <EdSkinPage
        locale={locale}
        pageKey="company"
        doc={doc}
        site={site}
        data={{ company: data }}
      />
    </>
  )
}
