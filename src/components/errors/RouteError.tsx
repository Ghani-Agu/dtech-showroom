'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

/**
 * ROUND 20 — one body for every storefront route-level error boundary.
 *
 * The five boundaries (brand, category, product, inquiry, search) were copies
 * of the same markup carrying hardcoded ENGLISH copy and a plain `next/link`.
 * That second detail is a real navigation bug, not just a style slip: routing
 * runs with `localePrefix: 'always'`, so `href="/brands"` has no locale
 * segment and the middleware sends it to the DEFAULT locale — an Arabic
 * visitor who errors on /ar/brands/hp lands on the French brand index.
 * `@/i18n/routing`'s Link keeps the active locale.
 *
 * Deliberately skin-neutral. `error.tsx` replaces the PAGE and keeps the
 * layout, and the editorial `.editorial-root` scope is applied by
 * EditorialPageShell *inside* each page — so by the time this renders that
 * scope is gone and any `.ed*` class here would resolve to nothing. The
 * theme tokens below are global and read correctly under all three skins.
 */

/** i18n sub-key under `errors`, and the route it offers as a way out. */
export type ErrorScope = 'brand' | 'category' | 'product' | 'inquiry' | 'search'

export function RouteError({
  error,
  reset,
  scope,
  href,
  values,
}: {
  error: Error & { digest?: string }
  reset: () => void
  scope: ErrorScope
  /** Locale-relative fallback destination. */
  href: '/brands' | '/categories' | '/'
  /** ICU arguments for `errors.<scope>.description`. */
  values?: Record<string, string>
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error(`[${scope}-error]`, error)
  }, [error, scope])

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-surface-base px-8 py-16">
      <div className="max-w-xl space-y-6 text-center" role="alert">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">{t('title')}</p>
        <h1 className="font-display text-5xl tracking-tight text-text-primary">
          {t('heading')}
          <span className="text-accent">.</span>
        </h1>
        <p className="font-body text-lg text-text-secondary">
          {t(`${scope}.description`, values)}
        </p>
        {/* The digest is the only handle support has on a production error —
            the stack is stripped from the client bundle. */}
        {error.digest ? (
          <p className="font-mono text-xs text-text-muted">
            {t('digest')} : {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
          >
            {t('retry')}
          </button>
          <Link
            href={href}
            className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
          >
            {t(`${scope}.action`)} <span className="text-accent">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
