import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>
  poolWarned?: boolean
}

const rawConnectionString =
  process.env.DATABASE_URL ?? 'postgres://noop:noop@localhost:5432/noop'

/**
 * Supabase exposes TWO pooler ports on the SAME host:
 *
 *   :5432 — SESSION mode. Every client connection holds one real Postgres
 *           connection for its whole lifetime, hard-capped at `pool_size`
 *           (15 on the free plan). Each Vercel lambda AND each local
 *           `next dev` opens its own pool, so a few of them exhaust the 15
 *           and every query then fails with
 *           `(EMAXCONNSESSION) max clients reached in session mode`.
 *           Because getSessionUser() treats a failed query as "no session",
 *           that outage shows up as *"login succeeds then bounces back"* —
 *           which is exactly what broke on 2026-07-27, local + prod at once.
 *
 *   :6543 — TRANSACTION mode. Connections are multiplexed: hundreds of
 *           clients share those same 15 server connections. This is the mode
 *           serverless deployments are meant to use.
 *
 * Nothing in this codebase needs session-scoped state (no LISTEN/NOTIFY, no
 * advisory locks, no `SET` that must survive between statements), so a
 * session-mode Supabase URL is auto-upgraded to the transaction port. That
 * way a stale DATABASE_URL in Vercel or in .env.local can't take the site
 * down again. Set `DB_SESSION_MODE=1` to opt out (e.g. for a migration run).
 */
const SESSION_POOLER_PORT = /(@[^/@]*\.pooler\.supabase\.com):5432\b/i

const upgradedToTransactionPooler =
  process.env.DB_SESSION_MODE !== '1' && SESSION_POOLER_PORT.test(rawConnectionString)

const connectionString = upgradedToTransactionPooler
  ? rawConnectionString.replace(SESSION_POOLER_PORT, '$1:6543')
  : rawConnectionString

const isSupabasePooler = /\.pooler\.supabase\.com/i.test(connectionString)
/** Transaction-mode endpoints (Supavisor :6543, Neon -pooler, pgbouncer). */
const isTransactionPooler =
  /:6543\b/.test(connectionString) ||
  /-pooler\./i.test(connectionString) ||
  /pgbouncer=true/i.test(connectionString)
/** Session-mode Supabase pooler — only reachable via DB_SESSION_MODE=1 now. */
const isSessionPooler = isSupabasePooler && !isTransactionPooler
const isPooledEndpoint = isSupabasePooler || isTransactionPooler

/**
 * Connection pool sizing.
 *  - transaction pooler: several connections are fine, they are multiplexed.
 *  - session pooler: EVERY connection is a real server slot out of ~15 shared
 *    by prod + preview + local dev — stay tiny or you starve the others.
 *  - direct Postgres: conservative so several serverless instances don't
 *    exhaust the server's connection limit.
 * `max: 1` is deliberately NOT the default: it serialized every query in the
 * process behind one connection (slow admin, logins timing out).
 */
const defaultPoolMax = isTransactionPooler ? 5 : isSessionPooler ? 2 : 4
const poolMax = Number(process.env.DB_POOL_MAX ?? defaultPoolMax)

const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : defaultPoolMax,
    idle_timeout: 20, // close idle connections after 20s (serverless-friendly)
    /**
     * 4s, not 10s. A `force-dynamic` render fans out to a dozen-plus queries
     * against a database an ocean away; at 10s a single bad link turned one
     * page into a 30-70s render. The app-level deadline in db/health.ts sits
     * just above this so the driver's real error is the one that surfaces.
     */
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 4),
    // Poolers don't support server-side prepared statements.
    ...(isPooledEndpoint ? { prepare: false } : {}),
    /**
     * postgres.js prints every server NOTICE. ensure-schema.ts is a wall of
     * `IF NOT EXISTS` DDL, so every boot dumped ~25 "already exists,
     * skipping" objects and buried the lines that matter. Real problems are
     * ERRORs, not NOTICEs — set DB_DEBUG=1 to see them again.
     */
    onnotice:
      process.env.DB_DEBUG === '1'
        ? undefined
        : (notice) => {
            if (notice.severity && notice.severity !== 'NOTICE') {
              console.warn(`[db] ${notice.severity}: ${notice.message}`)
            }
          },
  })

// Warn ONCE per process — the module is evaluated in several Next runtimes.
if (upgradedToTransactionPooler && !globalForDb.poolWarned) {
  globalForDb.poolWarned = true
  console.warn(
    '[db] DATABASE_URL pointed at the Supabase SESSION pooler (:5432, max 15 clients). ' +
      'Using the transaction pooler (:6543) instead — update the env var to make it explicit.'
  )
}

// Cache on globalThis so dev HMR and repeated imports reuse one pool.
globalForDb.client = client

export const db = drizzle(client, { schema })
