import type { Metadata } from 'next'
import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { type Locale } from '@/i18n/config'
import { getAllBrands, getAllProducts } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('showroom.brandsPage')
  return { title: `${t('title1')} ${t('title2')}`, description: t('sub') }
}

export default async function BrandsPage() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom.brandsPage')
  const tCat = await getTranslations('showroom.categoriesPage')
  const [brands, products] = await Promise.all([
    getAllBrands(locale),
    getAllProducts(locale),
  ])
  const counts = new Map<string, number>()
  for (const p of products)
    counts.set(p.brand.slug, (counts.get(p.brand.slug) ?? 0) + 1)
  const sorted = [...brands].sort(
    (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0)
  )

  return (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="sr-in" style={{ marginBottom: 34 }}>
        <span className="sr-kicker">{t('kicker', { count: brands.length })}</span>
        <h1 className="sr-h1" style={{ marginTop: 14 }}>
          {t('title1')} <span className="acc">{t('title2')}</span>
        </h1>
        <p className="sr-sub" style={{ marginTop: 12 }}>{t('sub')}</p>
      </div>
      <div className="sr-grid sr-in sr-in-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        {sorted.map((b, i) => (
          <article key={b.id} className="sr-card" style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}>
            <Link href={`/brands/${b.slug}`} className="cover" aria-label={b.name} />
            <div className="imgbox" style={{ aspectRatio: '16 / 9' }}>
              <Image
                src={b.heroImagePath ?? '/images/placeholders/brand-placeholder.svg'}
                alt={b.name}
                fill
                sizes="(min-width: 1024px) 320px, 50vw"
                priority={i < 3}
              />
            </div>
            <div className="info">
              <span className="cat">{tCat('products', { count: counts.get(b.slug) ?? 0 })}</span>
              <h3 className="name" style={{ fontSize: 17 }}>{b.name}</h3>
              <p className="spec">{b.statement}</p>
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
