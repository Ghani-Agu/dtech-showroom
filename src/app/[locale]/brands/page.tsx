import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { type Locale } from '@/i18n/config'
import { getAllBrands, getAllProducts } from '@/server/queries'
import { getBrandMark, BrandMarkArt } from '@/components/home/brand-marks'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { BrandBrands } from '@/components/brand/BrandSections'
import { toBrandBrands } from '@/server/brand-data'

/**
 * ISR, not `force-dynamic`.
 *
 * This page reads nothing request-specific — no cookies, no session, no
 * searchParams — so rendering it per visitor meant every single visit paid a
 * round trip from the Vercel function to Postgres before a byte reached the
 * browser. Prerendered and revalidated, Vercel answers from the edge cache
 * closest to the visitor and the database is touched only when the content
 * actually changes. `revalidate` is the safety net; the real freshness comes
 * from revalidateStorefront() in every admin mutation (src/lib/revalidate.ts).
 *
 * setRequestLocale() is what MAKES this possible: without it next-intl reads
 * the locale from request headers, which silently opts the route back into
 * dynamic rendering.
 */
export const revalidate = 300

interface LocaleParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('showroom.brandsPage')
  return { title: `${t('title1')} ${t('title2')}`, description: t('sub') }
}

export default async function BrandsPage({ params }: LocaleParams) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const t = await getTranslations('showroom.brandsPage')
  const tCat = await getTranslations('showroom.categoriesPage')
  const [brands, products] = await Promise.all([
    getAllBrands(locale),
    getAllProducts(locale),
  ])

  // New "dtech Brand" design — same brands, brand-styled grid.
  const skinDesign = await getPublishedDesign()
  if (skinDesign === 'brand') {
        return (
      <BrandPageShell locale={locale}>
        <BrandBrands brands={toBrandBrands(brands, products)} />
      </BrandPageShell>
    )
  }
  if (skinDesign === 'editorial') {
    /* ROUND 19 — les marques sont groupées par relation commerciale réelle
       (propre / exclusive / officielle / distribuée), chaque carte menant à sa
       page /brands/<slug> plutôt que droit au catalogue filtré. Les sections
       lisent leurs libellés dans ED_TR, donc le traducteur next-intl n'est
       plus passé ici — ce qui supprime au passage l'appel `t('kicker')` qui
       affichait le littéral « {count} marques », faute d'argument. */
    const [doc, site] = await Promise.all([getEdDoc('brands'), getEdSite()])
    return (
      <EdSkinPage
        locale={locale}
        pageKey="brands"
        doc={doc}
        site={site}
        data={{ brands: toBrandBrands(brands, products) }}
      />
    )
  }

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
        {sorted.map((b, i) => {
          const mark = getBrandMark(b.slug, b.name)
          return (
          <article key={b.id} className="sr-card" style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}>
            <Link
              href={{ pathname: '/products', query: { brand: b.slug } }}
              className="sr-cov"
              aria-label={b.name}
            />
            <div
              className="sr-imgbox"
              style={{ aspectRatio: '16 / 9', background: mark.tile, color: mark.fg }}
            >
              <span className="sr-blogo">
                <BrandMarkArt slug={b.slug} name={b.name} h={54} maxW={220} />
              </span>
            </div>
            <div className="sr-body">
              <span className="sr-kick">{tCat('products', { count: counts.get(b.slug) ?? 0 })}</span>
              <h3 className="sr-name" style={{ fontSize: 17 }}>{b.name}</h3>
              <p className="sr-desc">{b.statement}</p>
              <div className="sr-meta">
                <span className="sr-mono" style={{ color: 'var(--sr-cyan)' }}>
                  {t('explore')} →
                </span>
              </div>
            </div>
          </article>
          )
        })}
      </div>
    </section>
  )
}
