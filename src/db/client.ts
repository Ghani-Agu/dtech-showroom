import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://noop:noop@localhost:5432/noop'

// Transaction-mode poolers (Supabase Supavisor :6543, Neon -pooler, pgbouncer)
// don't support server-side prepared statements — disable them there.
const isPooledEndpoint = /pooler|pgbouncer|:6543\//i.test(connectionString)

/**
 * Connection pool sizing. The previous `max: 1` serialized EVERY query in the
 * process behind a single connection — with several people using the site and
 * admin at once, session lookups and page queries queued behind each other
 * (slow navigation, logins timing out when someone else was working).
 * Pooled endpoints can take more concurrent connections; direct Postgres
 * connections stay conservative so several serverless instances don't exhaust
 * the server's connection limit.
 */
const poolMax = Number(
  process.env.DB_POOL_MAX ?? (isPooledEndpoint ? 10 : 4)
)

const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 4,
    idle_timeout: 20, // close idle connections after 20s (serverless-friendly)
    connect_timeout: 10,
    ...(isPooledEndpoint ? { prepare: false } : {}),
  })

// Cache on globalThis so dev HMR and repeated imports reuse one pool.
globalForDb.client = client

export const db = drizzle(client, { schema })
