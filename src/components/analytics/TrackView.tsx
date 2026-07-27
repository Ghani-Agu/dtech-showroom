'use client'

import { useEffect, useRef } from 'react'
import { analytics, type TrackedProduct } from '@/lib/analytics'

/**
 * Fires a GA view event once per mount. Server pages render this instead of
 * becoming client components themselves — it keeps `view_item` /
 * `view_item_list` / `search` reporting out of the page logic.
 *
 * The ref guard matters: React StrictMode double-invokes effects in dev, and
 * without it every view would be counted twice locally.
 */
export function TrackProductView({ product }: { product: TrackedProduct }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    analytics.viewItem(product)
    // Intentionally mount-only: a slug change remounts via the route key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export function TrackProductList({
  listName,
  items,
  searchTerm,
  facets,
}: {
  listName: string
  items: TrackedProduct[]
  /** When present, also emits `search` — /search and a filtered catalogue. */
  searchTerm?: string
  /**
   * Active catalogue facets. Reported here rather than from the chips: those
   * are server-rendered `<Link>`s, so there is no client handler to hook.
   */
  facets?: { category?: string | null; brand?: string | null; featured?: boolean }
}) {
  const key = `${listName}|${searchTerm ?? ''}|${items.map((i) => i.slug).join(',')}`
  const last = useRef<string>('')
  useEffect(() => {
    if (last.current === key) return
    last.current = key
    if (searchTerm) analytics.search(searchTerm)
    if (facets?.category) analytics.filter('category', facets.category)
    if (facets?.brand) analytics.filter('brand', facets.brand)
    if (facets?.featured) analytics.filter('featured', '1')
    if (items.length > 0) analytics.viewItemList(listName, items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}
