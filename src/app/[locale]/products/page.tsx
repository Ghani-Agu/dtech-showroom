import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { pokeCampaignScheduler } from '@/server/campaign-send-core'
import { ProductsBrowser } from '@/components/showroom/ProductsBrowser'
import { TrackProductList } from '@/components/analytics/TrackView'
import { toExplorerProducts } from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import { getAllProducts, getAllCategories, getAllBrands } from '@/server/queries'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EdProductsBrowser } from '@/components/editorial/EdProductsBrowser'
import { type EdLang } from '@/components/editorial/editorial-i18n'
import {
  parseProductQuery,
  productQueryToSearch,
  runProductQuery,
  shouldIndex,
  type RawSearchParams,
} from '@/lib/product-filters'
import {
  alternatesFor,
  openGraphFor,
  breadcrumbLd,
  itemListLd,
  jsonLdScript,
  absUrl,
} from '@/lib/seo'

export const dynamic = 'force-dynamic'

interface ProductsPageProps {
  searchParams: Promise<RawSearchParams>
}

/**
 * Title/description reflect the ACTIVE facets, so "HP laptops" gets its own
 * indexable title instead of every filter combination sharing one generic
 * catalogue title.
 */
async function buildSeo(sp: RawSearchParams, locale: Locale) {
  const rawQuery = parseProductQuery(sp)
  const [t, categories, brands, productsRaw] = await Promise.all([
    getTranslations('showroom.productsPage'),
    getAllCategories(locale),
    getAllBrands(locale),
    getAllProducts(locale),
  ])

  // Resolve against the CLAMPED page. Using the raw one meant ?page=9 on a
  // single-page result set returned page-1 content titled "— Page 9" with a
  // self-referential canonical and index:true, i.e. an unbounded set of
  // duplicate indexable URLs.
  const result = runProductQuery(toExplorerProducts(productsRaw), rawQuery)
  const query: typeof rawQuery = { ...rawQuery, page: result.page }
  const outOfRange = rawQuery.page !== result.page

  const catName = query.category
    ? (categories.find((c) => c.slug === query.category)?.name ?? null)
    : null
  const brandName = query.brand
    ? (brands.find((b) => b.slug === query.brand)?.name ?? null)
    : null

  let title = `${t('title1')} ${t('title2')}`.replace(/\s+/g, ' ').trim()
  if (catName && brandName) title = t('titleBrandCategory', { brand: brandName, category: catName })
  else if (catName) title = t('titleCategory', { category: catName })
  else if (brandName) title = t('titleBrand', { brand: brandName })
  if (query.q) title = t('titleSearch', { q: query.q })
  if (query.page > 1) title = t('titlePaged', { title, page: query.page })

  const description =
    catName || brandName
      ? t('subFiltered', {
          scope: [brandName, catName].filter(Boolean).join(' · '),
        })
      : t('sub')

  // Canonical keeps the facets (they are real, indexable pages) and the page
  // number (self-canonical paging is what Google asks for), but drops `q`.
  const canonicalPath = `/products${productQueryToSearch(query, query.q ? { q: '' } : {})}`

  return { query, title, description, canonicalPath, outOfRange }
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const sp = await searchParams
  const { query, title, description, canonicalPath, outOfRange } = await buildSeo(
    sp,
    locale
  )
  // Out-of-range pages resolve to page 1's content, so they must not be
  // indexed as separate URLs — the canonical already points at the real page.
  const indexable = shouldIndex(query) && !outOfRange

  return {
    title,
    description,
    alternates: alternatesFor(locale, canonicalPath),
    openGraph: openGraphFor(locale, canonicalPath, title, description),
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // ROUND 18 — the traffic-driven campaign poke used to live in the [locale]
  // layout. The catalogue routes are ISR now, so that layout is prerendered
  // and would only poke on regeneration. /products and /search read
  // searchParams and therefore still render per request, which makes them the
  // right home for it. Backstops: the admin layout does the same, and the
  // daily Vercel cron hits /api/cron/campaigns.
  pokeCampaignScheduler()

  const locale = (await getLocale()) as Locale
  const sp = await searchParams
  const query = parseProductQuery(sp)

  const [design, productsRaw] = await Promise.all([
    getPublishedDesign(),
    getAllProducts(locale),
  ])

  const all = toExplorerProducts(productsRaw)
  const result = runProductQuery(all, query)

  const t = await getTranslations('showroom.productsPage')
  const tNav = await getTranslations('showroom.nav')

  const ld = [
    breadcrumbLd(locale, [
      { name: tNav('home'), path: '' },
      { name: t('breadcrumb'), path: '/products' },
    ]),
    itemListLd(locale, result.items, result.offset),
  ]

  const header = (
    <>
      <span className="sr-kicker">
        {t('kicker', {
          count: result.total,
          cats: result.categories.length,
          brands: result.brands.length,
        })}
      </span>
      <h1 className="sr-h1">
        {t('title1')} <span className="acc">{t('title2')}</span>
      </h1>
      <p className="sr-sub">{t('sub')}</p>
    </>
  )

  /* Shared by both catalogue bodies: JSON-LD + the rel=prev/next link
     elements some crawlers still read. */
  const seoHead = (
    <>
      <script
        type="application/ld+json"
        // Server-rendered constant string built from our own data.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />
      {result.page > 1 ? (
        <link
          rel="prev"
          href={absUrl(
            locale,
            `/products${productQueryToSearch(query, { page: result.page - 1 })}`
          )}
        />
      ) : null}
      {result.page < result.totalPages ? (
        <link
          rel="next"
          href={absUrl(
            locale,
            `/products${productQueryToSearch(query, { page: result.page + 1 })}`
          )}
        />
      ) : null}
    </>
  )

  const tracker = (
    <TrackProductList
        listName={
          query.category || query.brand
            ? `catalogue:${[query.brand, query.category].filter(Boolean).join('/')}`
            : 'catalogue'
        }
        searchTerm={query.q || undefined}
        facets={{
          category: query.category,
          brand: query.brand,
          featured: query.featuredOnly,
        }}
        items={result.items.map((p) => ({
          slug: p.slug,
          name: p.name,
          brandName: p.brandName,
          categoryName: p.categoryName,
        }))}
      />
  )

  const body = (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      {seoHead}
      <header className="sr-in sr-pagehead">{header}</header>
      <div className="sr-in sr-in-2">
        <ProductsBrowser query={query} result={result} />
      </div>
      {tracker}
    </section>
  )

  // The brand skin keeps the shared browser: `.brand-root` remaps the --sr-*
  // tokens, so the showroom components render in brand colours.
  if (design === 'brand') {
    return <BrandPageShell locale={locale}>{body}</BrandPageShell>
  }

  /* ROUND 19 D — the editorial skin gets its OWN catalogue surface.
     Same engine (server-rendered, URL-as-state, crawlable facets, one page of
     cards on the wire); different presentation — brand marks instead of text
     chips, categories grouped into the 7 families, sticky toolbar. */
  if (design === 'editorial') {
    const edLang: EdLang = locale === 'en' || locale === 'ar' ? locale : 'fr'
    return (
      <EditorialPageShell locale={locale}>
        {seoHead}
        <EdProductsBrowser lang={edLang} query={query} result={result} />
        {tracker}
      </EditorialPageShell>
    )
  }

  return body
}
