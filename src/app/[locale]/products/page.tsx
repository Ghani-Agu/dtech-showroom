import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ProductExplorer } from '@/components/showroom/ProductExplorer'
import {
  facetFromProducts,
  toExplorerProducts,
} from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import { getAllProducts } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('showroom.productsPage')
  return {
    title: `${t('title1')} ${t('title2')}`.replace(/\s+/g, ' '),
    description: t('sub'),
  }
}

export default async function ProductsPage() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom.productsPage')

  const products = toExplorerProducts(await getAllProducts(locale))
  const brands = facetFromProducts(products, 'brand')
  const categories = facetFromProducts(products, 'category')

  return (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="sr-in" style={{ marginBottom: 30 }}>
        <span className="sr-kicker">
          {t('kicker', {
            count: products.length,
            cats: categories.length,
            brands: brands.length,
          })}
        </span>
        <h1 className="sr-h1" style={{ marginTop: 14 }}>
          {t('title1')} <span className="acc">{t('title2')}</span>
        </h1>
        <p className="sr-sub" style={{ marginTop: 12 }}>{t('sub')}</p>
      </div>
      <div className="sr-in sr-in-2">
        <ProductExplorer
          products={products}
          brands={brands}
          categories={categories}
        />
      </div>
    </section>
  )
}
