import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Carousel } from './Carousel'
import { ShowroomCard } from './ShowroomCard'
import { ProductSearchField } from './ProductSearchField'
import { ProductSortSelect } from './ProductSortSelect'
import {
  productQueryToSearch,
  hasActiveFilters,
  type ProductQuery,
  type ProductQueryResult,
} from '@/lib/product-filters'

/**
 * Catalogue browser — a SERVER component.
 *
 * Every filter is a real `<Link>`, so: no client-side filter state, no
 * 393-row payload, the URL is the state (shareable / bookmarkable / crawlable),
 * and search engines can walk the facets. Only the search box and the sort
 * dropdown need interactivity, and those are two tiny client islands.
 */
export async function ProductsBrowser({
  query,
  result,
  basePath = '/products',
  lock = 'none',
}: {
  query: ProductQuery
  result: ProductQueryResult
  basePath?: string
  /**
   * On /categories/x and /brands/x the facet is fixed by the ROUTE, not the
   * query. Locking it hides that lane and keeps the slug out of the query
   * string, so the canonical URL stays `/categories/x?brand=hp` rather than
   * `/categories/x?category=x&brand=hp`.
   */
  lock?: 'none' | 'brand' | 'category'
}) {
  const t = await getTranslations('showroom.filters')
  // Never serialise the locked facet — the path already carries it.
  const linkQuery: ProductQuery = {
    ...query,
    ...(lock === 'category' ? { category: null } : {}),
    ...(lock === 'brand' ? { brand: null } : {}),
  }
  const href = (patch: Partial<ProductQuery>) =>
    `${basePath}${productQueryToSearch(linkQuery, { page: 1, ...patch })}`
  const pageHref = (n: number) =>
    `${basePath}${productQueryToSearch(linkQuery, { page: n })}`

  const { items, total, totalPages, page, categories, brands, featuredCount } =
    result
  // The locked facet isn't a "filter the visitor applied", so it must not make
  // the reset row appear on an otherwise-unfiltered category page.
  const active = hasActiveFilters(linkQuery)

  // Windowed page list: 1 … p-1 p p+1 … N
  const pageNums: (number | '…')[] = []
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) {
      const prev = pageNums[pageNums.length - 1]
      if (typeof prev === 'number' && n - prev > 1) pageNums.push('…')
      pageNums.push(n)
    }
  }

  // Resolve display names defensively: for a contradictory pair (e.g.
  // ?category=printers&brand=dell where Dell makes no printers) each lane
  // excludes the other's selection, so BOTH lookups miss and neither removal
  // pill would render — leaving the visitor an empty grid and only a blanket
  // "reset". Falling back to the slug keeps both pills clickable.
  const activeCategoryLabel = linkQuery.category
    ? (categories.find((c) => c.slug === linkQuery.category)?.name ??
      linkQuery.category)
    : null
  const activeBrandLabel = linkQuery.brand
    ? (brands.find((b) => b.slug === linkQuery.brand)?.name ?? linkQuery.brand)
    : null

  return (
    <div className="sr-browser">
      {/* ── filter lanes ─────────────────────────────────────────── */}
      <div className="sr-filterbar">
        {lock !== 'category' && categories.length > 1 ? (
          <Carousel variant="chips" prevLabel={t('prev')} nextLabel={t('next')}>
            <Link
              href={href({ category: null })}
              className={!query.category ? 'sr-chip on' : 'sr-chip'}
              scroll={false}
            >
              {t('categoriesLabel')} · {t('all')}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={href({
                  category: query.category === c.slug ? null : c.slug,
                })}
                className={query.category === c.slug ? 'sr-chip on' : 'sr-chip'}
                scroll={false}
                aria-current={query.category === c.slug ? 'true' : undefined}
              >
                {c.name} <span className="n">{c.count}</span>
              </Link>
            ))}
          </Carousel>
        ) : null}

        {lock !== 'brand' && brands.length > 1 ? (
          <Carousel variant="chips" prevLabel={t('prev')} nextLabel={t('next')}>
            <Link
              href={href({ brand: null })}
              className={!query.brand ? 'sr-chip on' : 'sr-chip'}
              scroll={false}
            >
              {t('brandsLabel')} · {t('all')}
            </Link>
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={href({ brand: query.brand === b.slug ? null : b.slug })}
                className={query.brand === b.slug ? 'sr-chip on' : 'sr-chip'}
                scroll={false}
                aria-current={query.brand === b.slug ? 'true' : undefined}
              >
                {b.name} <span className="n">{b.count}</span>
              </Link>
            ))}
          </Carousel>
        ) : null}

        <div className="sr-toolbar">
          <ProductSearchField
            basePath={basePath}
            query={linkQuery}
            placeholder={t('searchPlaceholder')}
          />
          {featuredCount > 0 ? (
            <Link
              href={href({ featuredOnly: !query.featuredOnly })}
              className={query.featuredOnly ? 'sr-chip on sr-chip-flag' : 'sr-chip sr-chip-flag'}
              scroll={false}
              aria-pressed={query.featuredOnly}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3L7.3 13.6l-5-4.6 6.8-.8z" />
              </svg>
              {t('featuredOnly')} <span className="n">{featuredCount}</span>
            </Link>
          ) : null}
          <ProductSortSelect basePath={basePath} query={linkQuery} />
          <span className="sr-count sr-mono">
            {t('results', { count: total })}
            {totalPages > 1 ? (
              <>
                {' · '}
                <span dir="ltr">{t('page', { n: `${page} / ${totalPages}` })}</span>
              </>
            ) : null}
          </span>
        </div>

        {active ? (
          <div className="sr-activefilters">
            {activeCategoryLabel ? (
              <Link href={href({ category: null })} className="sr-pill" scroll={false}>
                {activeCategoryLabel}
                <span aria-hidden>×</span>
                <span className="sr-only">{t('clearFilter')}</span>
              </Link>
            ) : null}
            {activeBrandLabel ? (
              <Link href={href({ brand: null })} className="sr-pill" scroll={false}>
                {activeBrandLabel}
                <span aria-hidden>×</span>
                <span className="sr-only">{t('clearFilter')}</span>
              </Link>
            ) : null}
            {query.q ? (
              <Link href={href({ q: '' })} className="sr-pill" scroll={false}>
                “{query.q}”
                <span aria-hidden>×</span>
                <span className="sr-only">{t('clearFilter')}</span>
              </Link>
            ) : null}
            {query.featuredOnly ? (
              <Link href={href({ featuredOnly: false })} className="sr-pill" scroll={false}>
                {t('featuredOnly')}
                <span aria-hidden>×</span>
                <span className="sr-only">{t('clearFilter')}</span>
              </Link>
            ) : null}
            <Link href={basePath} className="sr-pill sr-pill-reset" scroll={false}>
              {t('reset')}
            </Link>
          </div>
        ) : null}
      </div>

      {/* ── results ──────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="sr-empty" style={{ marginTop: 26 }}>
          <p>{t('noResults')}</p>
          {active ? (
            <Link href={basePath} className="sr-btn sr-btn-ghost" style={{ marginTop: 14 }}>
              {t('reset')}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="sr-grid" style={{ marginTop: 24 }}>
          {items.map((p, i) => (
            <ShowroomCard
              key={p.slug}
              product={p}
              index={i}
              priority={page === 1 && i < 4}
            />
          ))}
        </div>
      )}

      {/* ── pagination (real links → crawlable + prefetched) ─────── */}
      {totalPages > 1 ? (
        <nav className="sr-pages" style={{ marginTop: 34 }} aria-label="Pagination">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="sr-page" aria-label={t('prevPage')} rel="prev">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <span className="sr-page is-disabled" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
          )}
          {pageNums.map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="sr-mono">…</span>
            ) : (
              <Link
                key={n}
                href={pageHref(n)}
                className={n === page ? 'sr-page on' : 'sr-page'}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </Link>
            )
          )}
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="sr-page" aria-label={t('nextPage')} rel="next">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <span className="sr-page is-disabled" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          )}
        </nav>
      ) : null}
    </div>
  )
}
