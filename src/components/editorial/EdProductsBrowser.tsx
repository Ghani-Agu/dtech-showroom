import { Link } from '@/i18n/routing'
import { EdCatalogCard } from './EdCatalogCard'
import { EdBrandChip } from './EdBrandChip'
import { EdRail } from './EdRail'
import { BrandMarkArt, getBrandMark } from '@/components/home/brand-marks'
import { ProductSearchField } from '@/components/showroom/ProductSearchField'
import { ProductSortSelect } from '@/components/showroom/ProductSortSelect'
import { groupByFamily } from './ed-families'
import { FamilyIcon } from './editorial-icons'
import { edT, edTf, type EdLang } from './editorial-i18n'
import {
  productQueryToSearch,
  hasActiveFilters,
  type ProductQuery,
  type ProductQueryResult,
} from '@/lib/product-filters'

/**
 * ROUND 19 (phase D) — /products for the editorial skin.
 *
 * The ARCHITECTURE is deliberately identical to the shared `ProductsBrowser`
 * it replaces, because that part was already right: this is a SERVER
 * component, every filter is a real `<Link>`, the URL is the state (so a
 * filtered view is shareable, bookmarkable, survives back-navigation and is
 * crawlable), and only one page of cards is ever sent to the browser. The two
 * client islands are the debounced search box and the sort select, reused
 * as-is.
 *
 * What changed is everything the visitor actually sees:
 *  - brands are filtered by their real vector MARK on their own colour, not
 *    by a row of grey text chips;
 *  - the 20 categories are grouped into the same 7 families as /catalogue, so
 *    the rail is scannable instead of being a 20-item wall;
 *  - the toolbar (count, search, sort, active filters) is sticky, so the
 *    controls stay reachable 24 cards down;
 *  - the cards give the product photo real room.
 *
 * It takes its strings from ED_TR rather than next-intl, like every other
 * editorial component, so `lang` is threaded in from the route.
 */
export function EdProductsBrowser({
  lang,
  query,
  result,
  basePath = '/products',
}: {
  lang: EdLang
  query: ProductQuery
  result: ProductQueryResult
  basePath?: string
}) {
  const t = (k: string) => edT(lang, k)
  const tf = (k: string, v: Record<string, string | number>) => edTf(lang, k, v)

  const href = (patch: Partial<ProductQuery>) =>
    `${basePath}${productQueryToSearch(query, { page: 1, ...patch })}`
  const pageHref = (n: number) => `${basePath}${productQueryToSearch(query, { page: n })}`

  const { items, total, totalPages, page, categories, brands, featuredCount } = result
  const active = hasActiveFilters(query)

  // Windowed page list: 1 … p-1 p p+1 … N
  const pageNums: (number | '…')[] = []
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) {
      const prev = pageNums[pageNums.length - 1]
      if (typeof prev === 'number' && n - prev > 1) pageNums.push('…')
      pageNums.push(n)
    }
  }

  /* Resolve labels defensively. For a contradictory pair (?category=printers
     &brand=dell, where Dell makes no printers) each facet list excludes the
     other's selection, so BOTH lookups miss — falling back to the slug keeps
     every removal chip clickable instead of stranding the visitor on an empty
     grid with only a blanket reset. (Inherited from the shared browser; the
     bug it prevents is easy to reintroduce.) */
  const catLabel = query.category
    ? (categories.find((c) => c.slug === query.category)?.name ?? query.category)
    : null
  const brandLabel = query.brand
    ? (brands.find((b) => b.slug === query.brand)?.name ?? query.brand)
    : null

  const groups = groupByFamily(categories)

  const chip = (label: string, to: Partial<ProductQuery>, key: string) => (
    <Link key={key} href={href(to)} className="edp-chip" scroll={false}>
      {label}
      <span aria-hidden>×</span>
      <span className="sr-only">{t('pf.clear')}</span>
    </Link>
  )

  return (
    <div className="edp">
      {/* ── Head ── */}
      <header className="edp-head">
        <span className="eyebrow">{t('pf.eyebrow')}</span>
        <h1 className="h2">{t('pf.title')}</h1>
        <p className="lede">
          {tf('pf.lede', {
            count: total,
            cats: categories.length,
            brands: brands.length,
          })}
        </p>
      </header>

      {/* ── Brand strip: ONE row, mark + name ──
          Round 19 wrapped this to three rows of mark-only chips, which pushed
          the results below the fold and left the illegible marks (MSI's
          dragon, Game Revolution's stacked wordmark) unlabelled. It is now a
          single scrollable rail and every chip states its brand. */}
      {brands.length > 1 ? (
        <EdRail
          className="edp-brands"
          label={t('pf.brands')}
          prevLabel={t('pf.railPrev')}
          nextLabel={t('pf.railNext')}
        >
          {/* No count here: `total` is the count AFTER the brand filter, so
              on ?brand=hp this read "Toutes 31" and led to 393 results. */}
          <Link
            href={href({ brand: null })}
            className={`edp-ball${!query.brand ? ' on' : ''}`}
            scroll={false}
          >
            {t('pf.all')}
          </Link>
          {brands.map((b) => (
            <EdBrandChip
              key={b.slug}
              slug={b.slug}
              name={b.name}
              count={b.count}
              href={href({ brand: query.brand === b.slug ? null : b.slug })}
              active={query.brand === b.slug}
            />
          ))}
        </EdRail>
      ) : null}

      <div className="edp-layout">
        {/* ── Filter rail ── */}
        {/* data-lenis-prevent: the rail is a sticky nested scroller
            (max-height + overflow-y), and Lenis runs with smoothWheel and
            allowNestedScroll:false — without this the wheel scrolls the page
            and the bottom families are unreachable by mouse. */}
        <aside className="edp-rail" aria-label={t('pf.filters')} data-lenis-prevent>
          {/* Without this the outline jumped h1 → h3 (the family headings). */}
          <h2 className="sr-only">{t('pf.filters')}</h2>
          <div className="edp-search">
            <ProductSearchField
              basePath={basePath}
              query={query}
              placeholder={t('pf.search')}
            />
          </div>

          {featuredCount > 0 ? (
            <Link
              href={href({ featuredOnly: !query.featuredOnly })}
              className={`edp-feat${query.featuredOnly ? ' on' : ''}`}
              scroll={false}
              aria-pressed={query.featuredOnly}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3L7.3 13.6l-5-4.6 6.8-.8z" />
              </svg>
              {t('pf.featured')}
              <i>{featuredCount}</i>
            </Link>
          ) : null}

          {/* Categories, grouped into the same 7 families as /catalogue —
              a flat 20-item list is a wall; seven labelled groups is a menu. */}
          {/* data-lenis-prevent below: below the breakpoint where this becomes
              a horizontal overflow-x:auto rail, Lenis (allowNestedScroll:false)
              would otherwise eat the gesture and scroll the page instead. */}
          {categories.length > 1 ? (
            <nav className="edp-cats" aria-label={t('pf.cats')} data-lenis-prevent-touch>
              <Link
                href={href({ category: null })}
                className={`edp-cat${!query.category ? ' on' : ''}`}
                scroll={false}
              >
                <span>{t('pf.allCats')}</span>
                <i>{total}</i>
              </Link>
              {groups.map(({ family, cats }) => (
                <div
                  className="edp-fam"
                  key={family.id}
                  style={{ ['--h' as string]: String(family.hue) }}
                >
                  <h3>
                    <FamilyIcon n={family.icon} s={14} />
                    {t(`fam.${family.id}`)}
                  </h3>
                  {cats.map((c) => (
                    <Link
                      key={c.slug}
                      href={href({ category: query.category === c.slug ? null : c.slug })}
                      className={`edp-cat${query.category === c.slug ? ' on' : ''}`}
                      scroll={false}
                      aria-current={query.category === c.slug ? 'true' : undefined}
                    >
                      <span>{c.name}</span>
                      <i>{c.count}</i>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          ) : null}
        </aside>

        {/* ── Results ── */}
        <div className="edp-results">
          <div className="edp-toolbar">
            <p className="edp-count">
              <b>{total}</b> {t('pf.results')}
              {totalPages > 1 ? (
                <span dir="ltr" className="edp-page">
                  {page} / {totalPages}
                </span>
              ) : null}
            </p>
            <div className="edp-sort">
              <ProductSortSelect basePath={basePath} query={query} />
            </div>
          </div>

          {active ? (
            <div className="edp-chips">
              {catLabel ? chip(catLabel, { category: null }, 'cat') : null}
              {brandLabel ? chip(brandLabel, { brand: null }, 'brand') : null}
              {query.q ? chip(`« ${query.q} »`, { q: '' }, 'q') : null}
              {query.featuredOnly
                ? chip(t('pf.featured'), { featuredOnly: false }, 'feat')
                : null}
              <Link href={basePath} className="edp-chip reset" scroll={false}>
                {t('pf.reset')}
              </Link>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="edp-empty">
              <span aria-hidden>∅</span>
              <p>{t('pf.none')}</p>
              {active ? (
                <Link href={basePath} className="btn btn-k">
                  {t('pf.reset')}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="edp-grid">
              {items.map((p, i) => {
                const m = getBrandMark(p.brandSlug, p.brandName)
                return (
                  <EdCatalogCard
                    key={p.slug}
                    product={p}
                    priority={page === 1 && i < 4}
                    tile={m.tile}
                    fg={m.fg}
                    /* Rendered HERE, on the server: passing the mark as a
                       node keeps the 34 KB of brand path data off the client
                       even though the card needs 'use client' for the cart. */
                    mark={<BrandMarkArt slug={p.brandSlug} name={p.brandName} h={15} maxW={52} />}
                  />
                )
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="edp-pages" aria-label="Pagination">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="edp-pg arrow" aria-label={t('pf.prev')} rel="prev">
                  ‹
                </Link>
              ) : (
                <span className="edp-pg arrow off" aria-hidden>
                  ‹
                </span>
              )}
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span key={`e${i}`} className="edp-gap">
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    className={`edp-pg${n === page ? ' on' : ''}`}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
                  </Link>
                )
              )}
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="edp-pg arrow" aria-label={t('pf.next')} rel="next">
                  ›
                </Link>
              ) : (
                <span className="edp-pg arrow off" aria-hidden>
                  ›
                </span>
              )}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  )
}
