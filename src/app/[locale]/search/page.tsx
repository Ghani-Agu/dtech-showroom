import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { pokeCampaignScheduler } from '@/server/campaign-send-core'
import { Link } from '@/i18n/routing'
import { SearchInput } from '@/components/search/SearchInput'
import { ShowroomCard } from '@/components/showroom/ShowroomCard'
import { toExplorerProducts } from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import { searchProducts } from '@/server/queries'
import { Suspense } from 'react'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { EdGridPage } from '@/components/editorial/EditorialCollections'
import { BrandGridPage } from '@/components/brand/BrandCollections'
import { toBrandProducts } from '@/server/brand-data'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('search')
  return { title: t('pageTitle') }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // ROUND 18 — the traffic-driven campaign poke used to live in the [locale]
  // layout. The catalogue routes are ISR now, so that layout is prerendered
  // and would only poke on regeneration. /products and /search read
  // searchParams and therefore still render per request, which makes them the
  // right home for it. Backstops: the admin layout does the same, and the
  // daily Vercel cron hits /api/cron/campaigns.
  pokeCampaignScheduler()

  const locale = (await getLocale()) as Locale
  const t = await getTranslations('search')
  const tShowroom = await getTranslations('showroom')
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const rawResults = query.length >= 2 ? await searchProducts(query, locale) : []

  // New "dtech Brand" design — brand-styled search results.
  const skinDesign = await getPublishedDesign()
  if (skinDesign === 'brand') {
        return (
      <BrandPageShell locale={locale}>
        <BrandGridPage
          eyebrow={t('pageTitle')}
          title={query ? `« ${query} »` : t('pageTitle')}
          products={toBrandProducts(rawResults)}
          emptyLabel={query ? t('noResults') : t('placeholder')}
        />
      </BrandPageShell>
    )
  }
  if (skinDesign === 'editorial') {
    /* `data.grid` est rempli EN PLUS du fragment : la section « Grille de
       produits » du registre lit `ctx.data.grid`, donc un auteur qui remplace
       le bloc verrouillé par cette section-là obtient les mêmes résultats. */
    const grid = {
      products: toBrandProducts(rawResults),
      eyebrow: t('pageTitle'),
      title: query ? `« ${query} »` : t('pageTitle'),
      empty: query ? t('noResults') : t('placeholder'),
    }
    const [doc, site] = await Promise.all([getEdDoc('search'), getEdSite()])
    return (
      <EdSkinPage
        locale={locale}
        pageKey="search"
        doc={doc}
        site={site}
        data={{ grid }}
        slots={{
          body: (
            <EdGridPage
              eyebrow={grid.eyebrow}
              title={grid.title}
              products={grid.products}
              emptyLabel={grid.empty}
            />
          ),
        }}
      />
    )
  }

  const results = toExplorerProducts(rawResults)

  return (
    <section className="sr-wrap" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="sr-in" style={{ marginBottom: 28 }}>
        <span className="sr-kicker">
          {t('pageTitle')}
          {query ? ` · ${results.length}` : ''}
        </span>
        <h1 className="sr-h1" style={{ marginTop: 14 }}>
          {query ? (
            <>
              {t('resultsFor')} <span className="acc">“{query}”</span>
            </>
          ) : (
            <>
              {t('heading')}
              <span className="acc">.</span>
            </>
          )}
        </h1>
        <div style={{ marginTop: 20, maxWidth: 520 }}>
          <Suspense fallback={null}>
            <SearchInput />
          </Suspense>
        </div>
      </div>

      {query.length >= 2 && results.length === 0 ? (
        <div className="sr-empty sr-in sr-in-2">
          <p>{t('noResults')}</p>
          <p className="sr-mono" style={{ marginTop: 8 }}>{t('noResultsHint')}</p>
          <Link href="/products" className="sr-btn sr-btn-ghost" style={{ marginTop: 16 }}>
            {tShowroom('product.backCatalog')} →
          </Link>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="sr-grid sr-in sr-in-2">
          {results.map((p, i) => (
            <ShowroomCard key={p.slug} product={p} index={i} priority={i < 4} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
