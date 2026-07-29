import 'server-only'
import { revalidatePath } from 'next/cache'
import { bustDataCache } from './data-cache'

/**
 * revalidate.ts — the one call every admin mutation owes the storefront.
 *
 * The catalogue routes are ISR (`export const revalidate`), so a published
 * change reaches visitors through Next's route cache, not through a fresh
 * render. Two caches must be dropped together or a publish looks like it did
 * nothing:
 *
 *   1. bustDataCache()      — this process's in-memory rows (data-cache.ts),
 *                             including the stale copy, so the regeneration
 *                             reads live data instead of what it had before.
 *   2. revalidatePath()     — Next's route cache, so the next request actually
 *                             regenerates instead of replaying stored HTML.
 *
 * WHY EXPLICIT ROUTE PATTERNS
 * ------------------------------------------------------------------
 * Every storefront route lives under `app/[locale]`, so the real paths are
 * `/fr`, `/en/products/x`, `/ar/brands` — never `/` or `/products/x`. The
 * pre-existing per-path calls (`revalidatePath('/brands')`) were written when
 * the whole site was `force-dynamic` and nothing was cached, so being one
 * segment short cost nothing and hid the mistake.
 *
 * `revalidatePath('/', 'layout')` is NOT enough either, and this was measured,
 * not assumed: with a product edited in the database and that call made, the
 * cached product page kept serving the old name. Next only drops a prerendered
 * dynamic route when it is named by its LITERAL PATTERN with type 'page' —
 * `/[locale]/products/[productSlug]`, brackets and all. So every ISR route is
 * listed here by pattern. The layout call stays for chrome-level changes
 * (theme, published design, site settings).
 *
 * ADDING AN ISR ROUTE? ADD IT TO THIS LIST. A route that is cached but never
 * revalidated looks exactly like "the admin is broken".
 */

/** Every prerendered storefront route, by literal pattern. */
const ISR_ROUTES = [
  '/[locale]',
  '/[locale]/about',
  '/[locale]/brands',
  '/[locale]/legal',
  '/[locale]/products/[productSlug]',
  '/[locale]/[...slug]',
  // ── Round 19 ──
  // /catalogue renders category names and per-category counts, so it goes
  // stale the moment a product is added, archived or re-categorised.
  '/[locale]/catalogue',
  // /contact is constants-only today, but it IS prerendered, and leaving a
  // prerendered route off this list is exactly the silent-no-op trap the
  // header comment above warns about.
  '/[locale]/contact',
  // Per-brand pages render the brand row (statement, description, hero) AND
  // its live product/category counts — stale on any product OR brand edit.
  '/[locale]/brands/[brandSlug]',
  // ── Round 19 phase C ──
  // /gaming reads the whole catalogue through isGamingProduct(); /company
  // reads product, brand and category counts. Both go stale on any catalogue
  // mutation.
  '/[locale]/gaming',
  '/[locale]/company',
] as const

export function revalidateStorefront(cachePrefix?: string): void {
  bustDataCache(cachePrefix)
  for (const route of ISR_ROUTES) revalidatePath(route, 'page')
  // Chrome-level changes (design switch, theme, GA/chat settings) live in the
  // [locale] layout rather than in any one page.
  revalidatePath('/', 'layout')
}
