'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from '@/i18n/routing'
import { productQueryToSearch, type ProductQuery } from '@/lib/product-filters'

/**
 * Debounced search box that writes to the URL rather than to local state, so
 * the server does the filtering and the result stays shareable. Small enough
 * that it's the only interactive piece of the filter bar besides the sort.
 */
export function ProductSearchField({
  basePath,
  query,
  placeholder,
}: {
  basePath: string
  query: ProductQuery
  placeholder: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(query.q)
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track what the URL says so an external navigation (chip click, back
  // button) re-syncs the input instead of fighting it.
  const urlValue = useRef(query.q)
  // Always build the next URL from the LATEST query. A pending timeout used to
  // close over the query from the render that scheduled it, so clicking a
  // category chip within the debounce window fired a replace() that wiped the
  // category the click had just applied.
  const latestQuery = useRef(query)
  latestQuery.current = query

  useEffect(() => {
    if (urlValue.current !== query.q) {
      urlValue.current = query.q
      setValue(query.q)
      // The URL changed underneath us (chip click, back button) — drop any
      // in-flight debounce so it can't overwrite the new state.
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [query.q])

  // Also cancel when a NON-q facet changes, for the same reason.
  const facetKey = `${query.category}|${query.brand}|${query.sort}|${query.featuredOnly}`
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [facetKey])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const push = (next: string) => {
    urlValue.current = next
    startTransition(() => {
      router.replace(
        `${basePath}${productQueryToSearch(latestQuery.current, { q: next, page: 1 })}`,
        { scroll: false }
      )
    })
  }

  const onChange = (next: string) => {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(next), 320)
  }

  return (
    <span className={isPending ? 'sr-search sr-search-busy' : 'sr-search'}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        className="sr-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (timer.current) clearTimeout(timer.current)
            push(value)
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </span>
  )
}
