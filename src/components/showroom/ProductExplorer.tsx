'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Carousel } from './Carousel'
import { ShowroomCard, type ShowroomProduct } from './ShowroomCard'

export interface ExplorerProduct extends ShowroomProduct {
  brandSlug: string
  categorySlug: string
  featured: boolean
}

export interface FacetOption {
  slug: string
  name: string
  count: number
}

const PER_PAGE = 24

/**
 * Client-side product explorer: chip filters (scrollable lanes with
 * arrows), text filter, sort, pagination. Used on /products and, with a
 * locked facet, on category & brand pages.
 */
export function ProductExplorer({
  products,
  brands,
  categories,
  lock = 'none',
}: {
  products: ExplorerProduct[]
  brands: FacetOption[]
  categories: FacetOption[]
  lock?: 'none' | 'brand' | 'category'
}) {
  const t = useTranslations('showroom.filters')
  const [brand, setBrand] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'featured' | 'az' | 'za'>('featured')
  const [page, setPage] = useState(1)
  const topRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = products.filter(
      (p) =>
        (!brand || p.brandSlug === brand) &&
        (!category || p.categorySlug === category) &&
        (!needle ||
          p.name.toLowerCase().includes(needle) ||
          p.brandName.toLowerCase().includes(needle))
    )
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name))
    else
      list.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          a.name.localeCompare(b.name)
      )
    return list
  }, [products, brand, category, q, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  // reset page when filters change
  const filterKey = `${brand}|${category}|${q}|${sort}`
  const lastKey = useRef(filterKey)
  useEffect(() => {
    if (lastKey.current !== filterKey) {
      lastKey.current = filterKey
      setPage(1)
    }
  }, [filterKey])

  const goto = (n: number) => {
    setPage(n)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasFilter = brand || category || q

  return (
    <div ref={topRef} style={{ scrollMarginTop: 90 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lock !== 'category' && categories.length > 1 ? (
          <Carousel variant="chips" prevLabel={t('prev')} nextLabel={t('next')}>
            <button
              type="button"
              className={!category ? 'sr-chip on' : 'sr-chip'}
              onClick={() => setCategory(null)}
            >
              {t('categoriesLabel')} · {t('all')}
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={category === c.slug ? 'sr-chip on' : 'sr-chip'}
                onClick={() => setCategory(category === c.slug ? null : c.slug)}
              >
                {c.name} <span className="n">{c.count}</span>
              </button>
            ))}
          </Carousel>
        ) : null}
        {lock !== 'brand' && brands.length > 1 ? (
          <Carousel variant="chips" prevLabel={t('prev')} nextLabel={t('next')}>
            <button
              type="button"
              className={!brand ? 'sr-chip on' : 'sr-chip'}
              onClick={() => setBrand(null)}
            >
              {t('brandsLabel')} · {t('all')}
            </button>
            {brands.map((b) => (
              <button
                key={b.slug}
                type="button"
                className={brand === b.slug ? 'sr-chip on' : 'sr-chip'}
                onClick={() => setBrand(brand === b.slug ? null : b.slug)}
              >
                {b.name} <span className="n">{b.count}</span>
              </button>
            ))}
          </Carousel>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <span className="sr-search" style={{ flex: '1 1 220px', maxWidth: 360 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="sr-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
            />
          </span>
          <select
            className="sr-select"
            style={{ width: 'auto' }}
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label={t('sort')}
          >
            <option value="featured">{t('sortFeatured')}</option>
            <option value="az">{t('sortAz')}</option>
            <option value="za">{t('sortZa')}</option>
          </select>
          <span className="sr-mono" style={{ marginInlineStart: 'auto' }}>
            {t('results', { count: filtered.length })}
            {totalPages > 1 ? (
              <>
                {' · '}
                <span dir="ltr">{t('page', { n: `${safePage} / ${totalPages}` })}</span>
              </>
            ) : null}
          </span>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="sr-empty" style={{ marginTop: 26 }}>
          <p>{t('noResults')}</p>
          {hasFilter ? (
            <button
              type="button"
              className="sr-btn sr-btn-ghost"
              style={{ marginTop: 14 }}
              onClick={() => {
                setBrand(null)
                setCategory(null)
                setQ('')
              }}
            >
              {t('reset')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="sr-grid" style={{ marginTop: 26 }} key={`${filterKey}|${safePage}`}>
          {pageItems.map((p, i) => (
            <ShowroomCard key={p.slug} product={p} index={i} priority={safePage === 1 && i < 4} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="sr-pages" style={{ marginTop: 34 }} aria-label="Pagination">
          <button type="button" className="sr-page" disabled={safePage === 1} onClick={() => goto(safePage - 1)} aria-label={t('prevPage')}>
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
            .reduce<(number | '…')[]>((acc, n, i, arr) => {
              if (i > 0 && typeof arr[i - 1] === 'number' && n - (arr[i - 1] as number) > 1) acc.push('…')
              acc.push(n)
              return acc
            }, [])
            .map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} className="sr-mono">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={n === safePage ? 'sr-page on' : 'sr-page'}
                  onClick={() => goto(n)}
                  aria-current={n === safePage ? 'page' : undefined}
                >
                  {n}
                </button>
              )
            )}
          <button type="button" className="sr-page" disabled={safePage === totalPages} onClick={() => goto(safePage + 1)} aria-label={t('nextPage')}>
            →
          </button>
        </nav>
      ) : null}
    </div>
  )
}
