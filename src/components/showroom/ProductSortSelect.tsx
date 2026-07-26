'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { analytics } from '@/lib/analytics'
import {
  productQueryToSearch,
  SORTS,
  type ProductQuery,
  type SortKey,
} from '@/lib/product-filters'

const LABEL_KEY: Record<SortKey, string> = {
  featured: 'sortFeatured',
  az: 'sortAz',
  za: 'sortZa',
  newest: 'sortNewest',
}

export function ProductSortSelect({
  basePath,
  query,
}: {
  basePath: string
  query: ProductQuery
}) {
  const t = useTranslations('showroom.filters')
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <select
      className="sr-select"
      style={{ width: 'auto' }}
      value={query.sort}
      onChange={(e) => {
        const sort = e.target.value as SortKey
        analytics.filter('sort', sort)
        startTransition(() => {
          router.replace(
            `${basePath}${productQueryToSearch(query, { sort, page: 1 })}`,
            { scroll: false }
          )
        })
      }}
      aria-label={t('sort')}
    >
      {SORTS.map((s) => (
        <option key={s} value={s}>
          {t(LABEL_KEY[s])}
        </option>
      ))}
    </select>
  )
}
