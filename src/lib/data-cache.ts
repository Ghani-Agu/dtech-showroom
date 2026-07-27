import 'server-only'

/**
 * data-cache.ts — in-process cache for hot storefront reads.
 *
 * Why not unstable_cache / "use cache"? Those serialize through the
 * incremental cache (Dates become strings, bytea buffers break) and add
 * moving parts. These are plain Maps in module scope, parked on globalThis
 * so they survive dev HMR: on Vercel each warm lambda instance keeps them
 * between invocations, locally the dev server keeps them across requests
 * AND across recompiles.
 *
 * THREE LAYERS
 * ------------------------------------------------------------------
 * 1. FRESH — value + expiry. A hit inside the TTL returns instantly.
 *
 * 2. STALE (last-known-good) — every successful read is also kept here with
 *    NO expiry. Once the TTL lapses the stale value is returned immediately
 *    and the refresh runs in the background: a visitor never waits on the
 *    network for data we already have. This is what stops a slow link from
 *    turning into a slow page.
 *
 * 3. IN-FLIGHT — concurrent callers asking for the same key share one
 *    promise. A homepage render asking for `products:all` from three places,
 *    or ten visitors arriving at once after an expiry, produce ONE query.
 *
 * FAILURE BEHAVIOUR — the point of the rewrite
 * ------------------------------------------------------------------
 * queries.ts `safe()` converts a DB error into an empty array, so a failed
 * read is indistinguishable from a legitimately empty one. Previously an
 * empty result was simply not cached, which meant an unreachable database
 * produced an EMPTY page and re-paid the full network timeout on every
 * single render. Now an empty/failed read falls back to the last known good
 * value when we have one: the catalogue stays on screen and the page stays
 * fast while the link is down.
 *
 * Freshness model is unchanged: every admin mutation calls bustDataCache(),
 * which drops fresh AND stale so the next read is live.
 */

interface Entry {
  value: unknown
  expires: number
}

interface Store {
  fresh: Map<string, Entry>
  stale: Map<string, unknown>
  inflight: Map<string, Promise<unknown>>
}

const g = globalThis as unknown as { __dtechDataCache?: Store }

const store: Store = (g.__dtechDataCache ??= {
  fresh: new Map(),
  stale: new Map(),
  inflight: new Map(),
})

/** Default TTL for storefront data (ms). */
export const TTL_MS = 60_000

const MAX_ENTRIES = 800

interface CachedOptions {
  /** Cache falsy/empty results too (e.g. a legit empty search, "no row yet"). */
  cacheEmpty?: boolean
  /** Override the default TTL. */
  ttlMs?: number
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function prune(map: Map<string, unknown>): void {
  if (map.size < MAX_ENTRIES) return
  const overflow = map.size - MAX_ENTRIES + 1
  let dropped = 0
  for (const k of map.keys()) {
    map.delete(k)
    if (++dropped >= overflow) break
  }
}

function remember(key: string, value: unknown, ttlMs: number): void {
  const now = Date.now()
  for (const [k, e] of store.fresh) {
    if (e.expires <= now) store.fresh.delete(k)
  }
  prune(store.fresh)
  prune(store.stale)
  store.fresh.set(key, { value, expires: now + ttlMs })
  store.stale.set(key, value)
}

/**
 * Fetch once, share with concurrent callers, and never let a failed read
 * erase what we already had.
 */
function revalidate<T>(
  key: string,
  fn: () => Promise<T>,
  options: CachedOptions
): Promise<T> {
  const existing = store.inflight.get(key)
  if (existing) return existing as Promise<T>

  const run = (async () => {
    try {
      const value = await fn()
      if (options.cacheEmpty || !isEmpty(value)) {
        remember(key, value, options.ttlMs ?? TTL_MS)
        return value
      }
      // Empty and not cacheable: almost always a swallowed DB error.
      // Prefer the last good value over showing an empty catalogue.
      if (store.stale.has(key)) return store.stale.get(key) as T
      return value
    } catch (err) {
      if (store.stale.has(key)) return store.stale.get(key) as T
      throw err
    } finally {
      store.inflight.delete(key)
    }
  })()

  store.inflight.set(key, run)
  return run
}

export async function cachedData<T>(
  key: string,
  fn: () => Promise<T>,
  options: CachedOptions = {}
): Promise<T> {
  const hit = store.fresh.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T

  // Expired but known: serve the old value NOW, refresh behind the response.
  if (store.stale.has(key)) {
    void revalidate(key, fn, options).catch(() => {
      /* the stale value already went out; a failed refresh is not fatal */
    })
    return store.stale.get(key) as T
  }

  // Cold: nothing to serve but the real read.
  return revalidate(key, fn, options)
}

/**
 * Invalidate cached reads. Call from every admin mutation (products,
 * brands, categories, images, editor publishes, design switch…).
 * Drops the stale copy too, so the next read is guaranteed live — an admin
 * must always see their own edit immediately.
 * With no prefix, clears everything — cheap, the next requests re-prime.
 */
export function bustDataCache(prefix?: string): void {
  if (!prefix) {
    store.fresh.clear()
    store.stale.clear()
    store.inflight.clear()
    return
  }
  for (const key of store.fresh.keys()) {
    if (key.startsWith(prefix)) store.fresh.delete(key)
  }
  for (const key of store.stale.keys()) {
    if (key.startsWith(prefix)) store.stale.delete(key)
  }
  for (const key of store.inflight.keys()) {
    if (key.startsWith(prefix)) store.inflight.delete(key)
  }
}

/** Diagnostics: how much the storefront can still serve without the DB. */
export function dataCacheSnapshot(): { fresh: number; stale: number; inflight: number } {
  return {
    fresh: store.fresh.size,
    stale: store.stale.size,
    inflight: store.inflight.size,
  }
}
