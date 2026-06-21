import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { ProductExplorer } from '@/components/showroom/ProductExplorer'
import {
  facetFromProducts,
  toExplorerProducts,
} from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import { getCategoryBySlug, getProductsByCategory } from '@/server/queries'
import { getPublishedPage } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildCategoryData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'

export const dynamic = 'force-dynamic'

interface CategoryPageProps {
  params: Promise<{ locale: string; categorySlug: string }>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug, locale as Locale)
  if (!category) notFound()
  return { title: category.name, description: category.description }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom')

  const category = await getCategoryBySlug(categorySlug, locale)
  if (!category) notFound()

  const rawProducts = await getProductsByCategory(categorySlug, locale)

  const tmpl = await getPublishedPage('tmpl:category')
  if (tmpl) {
    return (
      <PublishedPage
        doc={tmpl as unknown as PageDoc}
        data={buildCategoryData(category, rawProducts.slice(0, 48), rawProducts.length)}
      />
    )
  }

  const products = toExplorerProducts(rawProducts)
  const brands = facetFromProducts(products, 'brand')

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
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
            {t('categoriesPage.products', { count: products.length })}
          </span>
          <h1 className="sr-h1" style={{ marginTop: 10 }}>
            {category.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ marginTop: 8 }}>{category.description}</p>
        </div>
      </div>

      <div className="sr-in sr-in-2">
        <ProductExplorer
          products={products}
          brands={brands}
          categories={[]}
          lock="category"
        />
      </div>
    </section>
  )
}
