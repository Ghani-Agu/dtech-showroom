import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ProductsBrowser } from '@/components/showroom/ProductsBrowser'
import { TrackProductList } from '@/components/analytics/TrackView'
import { toExplorerProducts } from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import { getAllProducts, getAllCategories, getAllBrands } from '@/server/queries'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
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

  const body = (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <script
        type="application/ld+json"
        // Server-rendered constant string built from our own data.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />
      {/* rel=prev/next as real link elements for crawlers that still use them */}
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

      <header className="sr-in sr-pagehead">{header}</header>
      <div className="sr-in sr-in-2">
        <ProductsBrowser query={query} result={result} />
      </div>
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
    </section>
  )

  // Same browser in both skins: `.brand-root` remaps the --sr-* tokens, so the
  // showroom components render in brand colours. One catalogue surface to
  // maintain instead of two diverging ones.
  if (design === 'brand') {
    return <BrandPageShell locale={locale}>{body}</BrandPageShell>
  }
  if (design === 'editorial') {
    return <EditorialPageShell locale={locale}>{body}</EditorialPageShell>
  }

  return body
}
