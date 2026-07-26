import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ProductsBrowser } from '@/components/showroom/ProductsBrowser'
import { TrackProductList } from '@/components/analytics/TrackView'
import { toExplorerProducts } from '@/lib/showroom-data'
import {
  parseProductQuery,
  runProductQuery,
  type RawSearchParams,
} from '@/lib/product-filters'
import { type Locale } from '@/i18n/config'
import { getBrandBySlug, getProductsByBrand } from '@/server/queries'
import { getPublishedPage, getPublishedDesign } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildBrandData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { BrandGridPage } from '@/components/brand/BrandCollections'
import { toBrandProducts } from '@/server/brand-data'
import {
  alternatesFor,
  openGraphFor,
  breadcrumbLd,
  itemListLd,
  jsonLdScript,
} from '@/lib/seo'

export const dynamic = 'force-dynamic'

interface BrandPageProps {
  params: Promise<{ locale: string; brandSlug: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { locale, brandSlug } = await params
  const brand = await getBrandBySlug(brandSlug, locale as Locale)
  if (!brand) notFound()
  const path = `/brands/${brand.slug}`
  return {
    title: brand.name,
    description: brand.description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor(
      locale as Locale,
      path,
      brand.name,
      brand.description ?? ''
    ),
  }
}

export default async function BrandPage({
  params,
  searchParams,
}: BrandPageProps) {
  const { brandSlug } = await params
  const sp = await searchParams
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom')

  const brand = await getBrandBySlug(brandSlug, locale)
  if (!brand) notFound()

  const rawProducts = await getProductsByBrand(brandSlug, locale)

  // New "dtech Brand" design — brand-styled product grid for this brand.
  if ((await getPublishedDesign()) === 'brand') {
    return (
      <BrandPageShell locale={locale}>
        <BrandGridPage
          eyebrow={t('nav.brands')}
          title={brand.name}
          sub={brand.description ?? undefined}
          products={toBrandProducts(rawProducts)}
        />
      </BrandPageShell>
    )
  }

  const tmpl = await getPublishedPage('tmpl:brand')
  if (tmpl) {
    return (
      <PublishedPage
        doc={tmpl as unknown as PageDoc}
        data={buildBrandData(brand, rawProducts.slice(0, 48), rawProducts.length)}
      />
    )
  }

  // Same URL-driven engine as /products, with the brand fixed by the route.
  const query = parseProductQuery(sp)
  const result = runProductQuery(toExplorerProducts(rawProducts), {
    ...query,
    brand: null, // the route already scopes it
  })

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(locale, [
              { name: t('nav.home'), path: '' },
              { name: t('nav.brands'), path: '/brands' },
              { name: brand.name, path: `/brands/${brand.slug}` },
            ]),
            itemListLd(locale, result.items, result.offset),
          ]),
        }}
      />
      <nav className="sr-crumbs sr-in" style={{ marginBottom: 18 }}>
        <Link href="/">{t('nav.home')}</Link>
        <span className="sep">/</span>
        <Link href="/brands">{t('nav.brands')}</Link>
        <span className="sep">/</span>
        <span className="cur">{brand.name}</span>
      </nav>

      <div className="sr-hero sr-in" style={{ marginBottom: 30 }}>
        <Image
          src={brand.heroImagePath ?? '/images/placeholders/brand-hero.svg'}
          alt={brand.name}
          fill
          sizes="(min-width: 1280px) 1200px, 100vw"
          priority
        />
        <div className="veil" />
        <div className="inner">
          <span className="sr-kicker">
            {t('categoriesPage.products', { count: rawProducts.length })}
          </span>
          <h1 className="sr-h1" style={{ marginTop: 10 }}>
            {brand.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ marginTop: 8 }}>{brand.statement}</p>
        </div>
      </div>

      <div className="sr-in sr-in-2">
        <ProductsBrowser
          query={query}
          result={result}
          basePath={`/brands/${brand.slug}`}
          lock="brand"
        />
      </div>
      <TrackProductList
        listName={`brand:${brand.slug}`}
        searchTerm={query.q || undefined}
        facets={{ category: query.category, featured: query.featuredOnly }}
        items={result.items.map((p) => ({
          slug: p.slug,
          name: p.name,
          brandName: p.brandName,
          categoryName: p.categoryName,
        }))}
      />
    </section>
  )
}
