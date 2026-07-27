import 'server-only'

/**
 * health.ts — circuit breaker + hard deadline for every storefront DB read.
 *
 * THE PROBLEM THIS EXISTS TO KILL
 * ------------------------------------------------------------------
 * The storefront is `force-dynamic` everywhere and the database lives in
 * AWS eu-west-2, so one homepage render fans out to a dozen-plus queries
 * across a long, sometimes lossy link. postgres.js bounds a single connect
 * attempt (`connect_timeout`) and nothing bounded the *render*: when the
 * link stalled, each call independently burned the full timeout and the
 * page took 32s, 71s, once 3.8 minutes — while still returning 200 with an
 * empty catalogue, because queries.ts `safe()` swallows the error.
 *
 * THE GUARANTEE
 * ------------------------------------------------------------------
 * `withDb()` gives every call two bounds:
 *
 *  1. DEADLINE — no single DB call can occupy a render for more than
 *     DB_CALL_TIMEOUT_MS, whatever the driver is doing underneath.
 *  2. BREAKER — after FAILURE_THRESHOLD consecutive connectivity failures
 *     the breaker opens for OPEN_MS and every further call rejects
 *     *synchronously*. The 2nd..Nth query of a render costs microseconds
 *     instead of a fresh timeout each.
 *
 * Worst case with the defaults: the first render after the link dies pays
 * ~one deadline (the calls are issued concurrently), every render for the
 * next OPEN_MS is instant, then ONE half-open probe re-tests the link. The
 * page still renders — data-cache.ts serves the last good values.
 *
 * Nothing here retries. Retrying a dead link is what produced the 3.8-minute
 * render in the first place.
 */

interface DbHealth {
  consecutiveFailures: number
  /** Epoch ms until which the breaker stays open. 0 = closed. */
  openUntil: number
  /** True while the single half-open probe call is in flight. */
  probing: boolean
  lastError: string | null
  lastLoggedAt: number
}

// globalThis so the breaker survives dev HMR module re-evaluation and is
// shared by every Next runtime in the process.
const g = globalThis as unknown as { __dtechDbHealth?: DbHealth }

const health: DbHealth = (g.__dtechDbHealth ??= {
  consecutiveFailures: 0,
  openUntil: 0,
  probing: false,
  lastError: null,
  lastLoggedAt: 0,
})

function num(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}

/** Hard ceiling on any single guarded DB call. */
export const DB_CALL_TIMEOUT_MS = num('DB_CALL_TIMEOUT_MS', 6_000)
/** Consecutive connectivity failures before the breaker opens. */
const FAILURE_THRESHOLD = num('DB_BREAKER_THRESHOLD', 2)
/** How long the breaker stays open before allowing a probe. */
const OPEN_MS = num('DB_BREAKER_OPEN_MS', 12_000)
/** Rate-limit for the "database unreachable" console line. */
const LOG_EVERY_MS = 30_000

export class DbUnavailableError extends Error {
  readonly code = 'DB_UNAVAILABLE'
  constructor(message: string) {
    super(message)
    this.name = 'DbUnavailableError'
  }
}

/**
 * Errors that mean "the link is down", as opposed to a bad query. Only these
 * trip the breaker — a malformed SQL statement must not take the site out.
 * postgres.js surfaces its own string codes; Node surfaces errno codes; both
 * can hide one level down in `cause`.
 */
const CONNECTIVITY_CODES = new Set([
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_DESTROYED',
  'CONNECTION_ENDED',
  'CONNECTION_REFUSED',
  'DB_DEADLINE',
  'DB_UNAVAILABLE',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  // Supabase Supavisor / pgbouncer saturation — also a "back off" signal.
  'XX000',
])

const CONNECTIVITY_TEXT =
  /CONNECT_TIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ENETUNREACH|EHOSTUNREACH|CONNECTION_(CLOSED|ENDED|DESTROYED)|max clients|Connection terminated|write CONNECT/i

export function isConnectivityError(err: unknown): boolean {
  let cur: unknown = err
  for (let depth = 0; cur && depth < 5; depth++) {
    const e = cur as { code?: unknown; errno?: unknown; message?: unknown; cause?: unknown }
    const code = typeof e.code === 'string' ? e.code : undefined
    const errno = typeof e.errno === 'string' ? e.errno : undefined
    if (code && CONNECTIVITY_CODES.has(code)) return true
    if (errno && CONNECTIVITY_CODES.has(errno)) return true
    if (typeof e.message === 'string' && CONNECTIVITY_TEXT.test(e.message)) return true
    cur = e.cause
  }
  return false
}

/** Is the breaker currently refusing calls? Claims the half-open probe slot. */
function shouldReject(): boolean {
  if (health.openUntil === 0) return false
  if (Date.now() < health.openUntil) return true
  // Cool-down elapsed: let exactly ONE call through to re-test the link.
  if (health.probing) return true
  health.probing = true
  return false
}

function noteSuccess(): void {
  health.consecutiveFailures = 0
  health.probing = false
  if (health.openUntil !== 0) {
    health.openUntil = 0
    health.lastError = null
    console.warn('[db] connection recovered — serving live data again')
  }
}

function noteFailure(err: unknown): void {
  if (!isConnectivityError(err)) {
    // A real query error (bad SQL, missing column). Not the link's fault.
    health.probing = false
    return
  }
  health.consecutiveFailures += 1
  health.lastError = err instanceof Error ? err.message : String(err)
  health.probing = false

  if (health.consecutiveFailures >= FAILURE_THRESHOLD) {
    const wasOpen = health.openUntil > 0
    health.openUntil = Date.now() + OPEN_MS
    const now = Date.now()
    if (!wasOpen || now - health.lastLoggedAt > LOG_EVERY_MS) {
      health.lastLoggedAt = now
      console.warn(
        `[db] database unreachable — pausing queries for ${Math.round(OPEN_MS / 1000)}s ` +
          `and serving cached data. Last error: ${health.lastError}`
      )
    }
  }
}

/** Snapshot for diagnostics / health endpoints. */
export function dbHealthSnapshot(): {
  ok: boolean
  openForMs: number
  consecutiveFailures: number
  lastError: string | null
} {
  const remaining = Math.max(0, health.openUntil - Date.now())
  return {
    ok: remaining === 0,
    openForMs: remaining,
    consecutiveFailures: health.consecutiveFailures,
    lastError: health.lastError,
  }
}

/** True when the breaker is open — callers can skip optional work entirely. */
export function isDbUnavailable(): boolean {
  return health.openUntil > Date.now()
}

/**
 * Run a DB call under the deadline and the breaker.
 * Rejects immediately (no I/O) while the breaker is open.
 */
export async function withDb<T>(
  fn: () => Promise<T>,
  timeoutMs: number = DB_CALL_TIMEOUT_MS
): Promise<T> {
  if (shouldReject()) {
    throw new DbUnavailableError(
      `Database unreachable, retrying in ${Math.max(0, health.openUntil - Date.now())}ms`
    )
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const e = new DbUnavailableError(`DB call exceeded ${timeoutMs}ms deadline`)
          ;(e as { code: string }).code = 'DB_DEADLINE'
          reject(e)
        }, timeoutMs)
      }),
    ])
    noteSuccess()
    return result
  } catch (err) {
    noteFailure(err)
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }
}
