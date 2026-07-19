import 'server-only'

/**
 * data-cache.ts — tiny in-process TTL cache for hot storefront reads.
 *
 * Why not unstable_cache / "use cache"? Those serialize through the
 * incremental cache (Dates become strings, bytea buffers break) and add
 * moving parts. This is a plain Map in module scope: on Vercel each warm
 * lambda instance keeps it between invocations, locally the dev server
 * keeps it between requests. Real object references are preserved.
 *
 * Freshness model:
 *  - every admin mutation calls bustDataCache() → the instance that served
 *    the admin request is fresh immediately;
 *  - other instances converge within TTL_MS (default 60 s) — the same
 *    staleness window a CDN would give, invisible for a catalogue that
 *    changes a few times a day;
 *  - `null` / `undefined` / empty arrays are NOT cached by default so a
 *    transient DB failure (queries.ts `safe()` returns []) can't pin an
 *    empty catalogue for a whole TTL.
 */

interface Entry {
  value: unknown
  expires: number
}

const store = new Map<string, Entry>()

/** Default TTL for storefront data (ms). */
export const TTL_MS = 60_000

const MAX_ENTRIES = 800

interface CachedOptions {
  /** Cache falsy/empty results too (e.g. a legit empty search). */
  cacheEmpty?: boolean
  /** Override the default TTL. */
  ttlMs?: number
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

export async function cachedData<T>(
  key: string,
  fn: () => Promise<T>,
  options: CachedOptions = {}
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expires > now) return hit.value as T

  const value = await fn()

  if (options.cacheEmpty || !isEmpty(value)) {
    if (store.size >= MAX_ENTRIES) {
      // Drop expired entries first; if still over, drop oldest inserted.
      for (const [k, e] of store) {
        if (e.expires <= now) store.delete(k)
      }
      if (store.size >= MAX_ENTRIES) {
        const first = store.keys().next().value
        if (first !== undefined) store.delete(first)
      }
    }
    store.set(key, { value, expires: now + (options.ttlMs ?? TTL_MS) })
  }

  return value
}

/**
 * Invalidate cached reads. Call from every admin mutation (products,
 * brands, categories, images, editor publishes, design switch…).
 * With no prefix, clears everything — cheap, the next requests re-prime.
 */
export function bustDataCache(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
