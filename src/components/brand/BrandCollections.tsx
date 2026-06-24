'use client'

/**
 * Brand-styled collection views: a titled product grid (used by single
 * category, single brand and search results) and a category-cards grid
 * (used by the categories listing). All reuse the Brand ProductCard and
 * scoped brand classes; rendered inside BrandPageShell.
 */

import { Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
import { ProductCard } from './BrandSections'
import { GridCatIcon } from './brand-icons'
import type { BrandProduct, BrandCategory } from './brand-types'

export function BrandGridPage({
  eyebrow,
  title,
  sub,
  products,
  emptyLabel,
}: {
  eyebrow?: string
  title: string
  sub?: string
  products: BrandProduct[]
  emptyLabel?: string
}) {
  const { t } = useBrand()
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <div className="sh-l">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1 className="h-sec">{title}</h1>
            {sub && <p className="lead">{sub}</p>}
          </div>
          <span className="meta">
            {products.length} {t('catalog.resultsWord')}
          </span>
        </div>
        {products.length > 0 ? (
          <div className="prod-grid">
            {products.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        ) : (
          <p className="lead">{emptyLabel ?? '—'}</p>
        )}
      </div>
    </section>
  )
}

export function BrandCategories({
  eyebrow,
  title,
  categories,
}: {
  eyebrow: string
  title: string
  categories: BrandCategory[]
}) {
  const { t } = useBrand()
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <div className="sh-l">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="h-sec">{title}</h1>
          </div>
        </div>
        <div className="brand-grid">
          {categories.map((c) => (
            <Link key={c.id} className="brandcard" href={`/categories/${c.id}`}>
              <span style={{ color: 'var(--teal-deep)' }}>
                <GridCatIcon kind={c.icon} size={28} />
              </span>
              <span className="lg" style={{ fontSize: 'clamp(18px,2vw,24px)' }}>{c.name}</span>
              <span className="cs">{c.count} {t('catalog.resultsWord')}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
