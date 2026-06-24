import type { Metadata } from 'next'
import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { type Locale } from '@/i18n/config'
import { getAllCategories, getAllProducts } from '@/server/queries'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { BrandCategories } from '@/components/brand/BrandCollections'
import { toBrandCategories } from '@/server/brand-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('showroom.categoriesPage')
  return { title: `${t('title1')} ${t('title2')}`, description: t('sub') }
}

export default async function CategoriesPage() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom.categoriesPage')
  const [categories, products] = await Promise.all([
    getAllCategories(locale),
    getAllProducts(locale),
  ])

  // New "dtech Brand" design — brand-styled category cards.
  if ((await getPublishedDesign()) === 'brand') {
    return (
      <BrandPageShell locale={locale}>
        <BrandCategories
          eyebrow={`${t('title1')} ${t('title2')}`}
          title={`${t('title1')} ${t('title2')}`}
          categories={toBrandCategories(categories, products)}
        />
      </BrandPageShell>
    )
  }

  const counts = new Map<string, number>()
  for (const p of products)
    counts.set(p.category.slug, (counts.get(p.category.slug) ?? 0) + 1)

  return (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="sr-in" style={{ marginBottom: 34 }}>
        <span className="sr-kicker">{t('kicker', { count: categories.length })}</span>
        <h1 className="sr-h1" style={{ marginTop: 14 }}>
          {t('title1')} <span className="acc">{t('title2')}</span>
        </h1>
        <p className="sr-sub" style={{ marginTop: 12 }}>{t('sub')}</p>
      </div>
      <div className="sr-grid sr-in sr-in-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        {categories.map((c, i) => (
          <article key={c.id} className="sr-card" style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}>
            <Link href={`/categories/${c.slug}`} className="cover" aria-label={c.name} />
            <div className="imgbox" style={{ aspectRatio: '16 / 9' }}>
              <Image
                src={c.heroImagePath ?? '/images/placeholders/category-placeholder.svg'}
                alt={c.name}
                fill
                sizes="(min-width: 1024px) 320px, 50vw"
                priority={i < 3}
              />
            </div>
            <div className="info">
              <span className="cat">{t('products', { count: counts.get(c.slug) ?? 0 })}</span>
              <h3 className="name" style={{ fontSize: 17 }}>{c.name}</h3>
              <p className="spec">{c.description}</p>
              <div className="meta">
                <span className="sr-mono" style={{ color: 'var(--sr-cyan)' }}>
                  {t('explore')} →
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
