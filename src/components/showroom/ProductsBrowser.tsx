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
 * Layout: brands run across the TOP (there are ~21, and they're the coarsest
 * cut a shopper makes), everything else lives in a RIGHT-hand rail beside the
 * grid. On narrow screens the rail moves above the results and the category
 * list turns into a horizontal scroller, so filters stay reachable without
 * scrolling past 24 cards.
 *
 * Every filter is a real `<Link>`: no client-side filter state, no 393-row
 * payload, the URL is the state (shareable / bookmarkable / crawlable), and
 * search engines can walk the facets. Only the search box and the sort select
 * need interactivity, and those are two tiny client islands.
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
   * query. Locking it hides that control and keeps the slug out of the query
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
  const activeCount =
    (linkQuery.category ? 1 : 0) +
    (linkQuery.brand ? 1 : 0) +
    (linkQuery.q ? 1 : 0) +
    (linkQuery.featuredOnly ? 1 : 0)

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
  // ?category=printers&brand=dell where Dell makes no printers) each facet list
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

  const pill = (label: string, to: Partial<ProductQuery>, key: string) => (
    <Link key={key} href={href(to)} className="sr-pill" scroll={false}>
      {label}
      <span aria-hidden>×</span>
      <span className="sr-only">{t('clearFilter')}</span>
    </Link>
  )

  return (
    <div className="sr-browser">
      {/* ── brands across the top ─────────────────────────────────── */}
      {lock !== 'brand' && brands.length > 1 ? (
        <section className="sr-brandbar" aria-label={t('brandsTitle')}>
          <h2 className="sr-barlabel">{t('brandsTitle')}</h2>
          <Carousel variant="chips" prevLabel={t('prev')} nextLabel={t('next')}>
            <Link
              href={href({ brand: null })}
              className={!linkQuery.brand ? 'sr-chip on' : 'sr-chip'}
              scroll={false}
            >
              {t('all')}
            </Link>
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={href({
                  brand: linkQuery.brand === b.slug ? null : b.slug,
                })}
                className={linkQuery.brand === b.slug ? 'sr-chip on' : 'sr-chip'}
                scroll={false}
                aria-current={linkQuery.brand === b.slug ? 'true' : undefined}
              >
                {b.name} <span className="n">{b.count}</span>
              </Link>
            ))}
          </Carousel>
        </section>
      ) : null}

      <div className="sr-layout">
        {/* ── results ─────────────────────────────────────────────── */}
        <div className="sr-results">
          <div className="sr-resultbar">
            <p className="sr-count sr-mono">
              {t('results', { count: total })}
              {totalPages > 1 ? (
                <>
                  {' · '}
                  <span dir="ltr">
                    {t('page', { n: `${page} / ${totalPages}` })}
                  </span>
                </>
              ) : null}
            </p>
            <ProductSortSelect basePath={basePath} query={linkQuery} />
          </div>

          {active ? (
            <div className="sr-activefilters">
              {activeCategoryLabel
                ? pill(activeCategoryLabel, { category: null }, 'cat')
                : null}
              {activeBrandLabel
                ? pill(activeBrandLabel, { brand: null }, 'brand')
                : null}
              {linkQuery.q ? pill(`“${linkQuery.q}”`, { q: '' }, 'q') : null}
              {linkQuery.featuredOnly
                ? pill(t('featuredOnly'), { featuredOnly: false }, 'feat')
                : null}
              <Link
                href={basePath}
                className="sr-pill sr-pill-reset"
                scroll={false}
              >
                {t('reset')}
              </Link>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="sr-empty">
              <p>{t('noResults')}</p>
              {active ? (
                <Link href={basePath} className="sr-btn sr-btn-ghost">
                  {t('reset')}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="sr-grid">
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

          {/* pagination — real links, so crawlable and prefetched */}
          {totalPages > 1 ? (
            <nav className="sr-pages" aria-label="Pagination">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="sr-page"
                  aria-label={t('prevPage')}
                  rel="prev"
                >
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
                <Link
                  href={pageHref(page + 1)}
                  className="sr-page"
                  aria-label={t('nextPage')}
                  rel="next"
                >
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

        {/* ── filter rail (right on desktop, above results on mobile) ─ */}
        <aside className="sr-rail" aria-label={t('filtersTitle')}>
          <div className="sr-railhead">
            <h2 className="sr-barlabel">{t('filtersTitle')}</h2>
            {activeCount > 0 ? (
              <Link href={basePath} className="sr-railreset" scroll={false}>
                {t('reset')}
              </Link>
            ) : null}
          </div>

          <ProductSearchField
            basePath={basePath}
            query={linkQuery}
            placeholder={t('searchPlaceholder')}
          />

          {featuredCount > 0 ? (
            <Link
              href={href({ featuredOnly: !linkQuery.featuredOnly })}
              className={
                linkQuery.featuredOnly
                  ? 'sr-railtoggle on'
                  : 'sr-railtoggle'
              }
              scroll={false}
              aria-pressed={linkQuery.featuredOnly}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3L7.3 13.6l-5-4.6 6.8-.8z" />
              </svg>
              {t('featuredOnly')}
              <span className="n">{featuredCount}</span>
            </Link>
          ) : null}

          {lock !== 'category' && categories.length > 1 ? (
            <div className="sr-railgroup">
              <h3 className="sr-railtitle">{t('categoriesTitle')}</h3>
              {/* Vertical list on desktop; CSS turns it into a horizontal
                  scroller on narrow screens so it stays one tap away. */}
              <div className="sr-railcats">
                <Link
                  href={href({ category: null })}
                  className={!linkQuery.category ? 'sr-railcat on' : 'sr-railcat'}
                  scroll={false}
                >
                  <span className="lbl">{t('all')}</span>
                  <span className="n">{total}</span>
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={href({
                      category: linkQuery.category === c.slug ? null : c.slug,
                    })}
                    className={
                      linkQuery.category === c.slug
                        ? 'sr-railcat on'
                        : 'sr-railcat'
                    }
                    scroll={false}
                    aria-current={
                      linkQuery.category === c.slug ? 'true' : undefined
                    }
                  >
                    <span className="lbl">{c.name}</span>
                    <span className="n">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
