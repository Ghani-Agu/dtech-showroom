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
import { getBrandBySlug, getProductsByBrand } from '@/server/queries'
import { getPublishedPage } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildBrandData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'

export const dynamic = 'force-dynamic'

interface BrandPageProps {
  params: Promise<{ locale: string; brandSlug: string }>
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { locale, brandSlug } = await params
  const brand = await getBrandBySlug(brandSlug, locale as Locale)
  if (!brand) notFound()
  return { title: brand.name, description: brand.description }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brandSlug } = await params
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom')

  const brand = await getBrandBySlug(brandSlug, locale)
  if (!brand) notFound()

  const rawProducts = await getProductsByBrand(brandSlug, locale)

  const tmpl = await getPublishedPage('tmpl:brand')
  if (tmpl) {
    return (
      <PublishedPage
        doc={tmpl as unknown as PageDoc}
        data={buildBrandData(brand, rawProducts.slice(0, 48), rawProducts.length)}
      />
    )
  }

  const products = toExplorerProducts(rawProducts)
  const categories = facetFromProducts(products, 'category')

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
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
            {t('categoriesPage.products', { count: products.length })}
          </span>
          <h1 className="sr-h1" style={{ marginTop: 10 }}>
            {brand.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ marginTop: 8 }}>{brand.statement}</p>
        </div>
      </div>

      <div className="sr-in sr-in-2">
        <ProductExplorer
          products={products}
          brands={[]}
          categories={categories}
          lock="brand"
        />
      </div>
    </section>
  )
}
