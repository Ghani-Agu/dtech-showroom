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
import { getCategoryBySlug, getProductsByCategory } from '@/server/queries'
import { getPublishedPage, getPublishedDesign } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildCategoryData } from '@/server/template-data'
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

interface CategoryPageProps {
  params: Promise<{ locale: string; categorySlug: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug, locale as Locale)
  if (!category) notFound()
  const path = `/categories/${category.slug}`
  return {
    title: category.name,
    description: category.description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor(
      locale as Locale,
      path,
      category.name,
      category.description ?? ''
    ),
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { categorySlug } = await params
  const sp = await searchParams
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom')

  const category = await getCategoryBySlug(categorySlug, locale)
  if (!category) notFound()

  const rawProducts = await getProductsByCategory(categorySlug, locale)

  // New "dtech Brand" design — brand-styled product grid for this category.
  if ((await getPublishedDesign()) === 'brand') {
    return (
      <BrandPageShell locale={locale}>
        <BrandGridPage
          eyebrow={t('nav.categories')}
          title={category.name}
          sub={category.description ?? undefined}
          products={toBrandProducts(rawProducts)}
        />
      </BrandPageShell>
    )
  }

  const tmpl = await getPublishedPage('tmpl:category')
  if (tmpl) {
    return (
      <PublishedPage
        doc={tmpl as unknown as PageDoc}
        data={buildCategoryData(category, rawProducts.slice(0, 48), rawProducts.length)}
      />
    )
  }

  // Same URL-driven engine as /products, with the category fixed by the route.
  // Previously this page shipped every product in the category to the browser
  // and filtered client-side, with no shareable state.
  const query = parseProductQuery(sp)
  const result = runProductQuery(toExplorerProducts(rawProducts), {
    ...query,
    category: null, // the route already scopes it
  })

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(locale, [
              { name: t('nav.home'), path: '' },
              { name: t('nav.categories'), path: '/categories' },
              { name: category.name, path: `/categories/${category.slug}` },
            ]),
            itemListLd(locale, result.items, result.offset),
          ]),
        }}
      />
      <nav className="sr-crumbs sr-in" style={{ marginBottom: 18 }}>
        <Link href="/">{t('nav.home')}</Link>
        <span className="sep">/</span>
        <Link href="/categories">{t('nav.categories')}</Link>
        <span className="sep">/</span>
        <span className="cur">{category.name}</span>
      </nav>

      <div className="sr-hero sr-in" style={{ marginBottom: 30 }}>
        <Image
          src={category.heroImagePath ?? '/images/placeholders/category-hero.svg'}
          alt={category.name}
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
            {category.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ marginTop: 8 }}>{category.description}</p>
        </div>
      </div>

      <div className="sr-in sr-in-2">
        <ProductsBrowser
          query={query}
          result={result}
          basePath={`/categories/${category.slug}`}
          lock="category"
        />
      </div>
      <TrackProductList
        listName={`category:${category.slug}`}
        searchTerm={query.q || undefined}
        facets={{ brand: query.brand, featured: query.featuredOnly }}
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
