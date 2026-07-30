import { sql } from 'drizzle-orm'
import { db } from '@/db/client'

/**
 * SUPABASE KEEP-ALIVE — one tiny write per day so the free project never
 * gets auto-paused.
 *
 * WHY A WRITE AND NOT `SELECT 1`
 * A Free-plan Supabase project is paused after ~7 days without *user*
 * database activity, and a pg_cron job running inside the instance is not
 * user activity — the request has to arrive from outside. So an external
 * scheduler (Vercel Cron, see vercel.json) calls
 * `GET /api/cron/keep-alive` once a day and we increment a counter.
 *
 * The counter is deliberately the cheapest possible audit log: open the
 * `keep_alive` row in the Supabase table editor and `ticks` /
 * `last_ping_at` tell you whether the scheduler is still firing. A
 * `last_ping_at` older than a day or two is the early warning that this
 * project is drifting toward a pause — a `SELECT 1` ping leaves no such
 * trace, which is exactly how a silently-broken keep-alive goes unnoticed
 * until the app is down.
 *
 * Once paused, Supavisor answers `FATAL: (ENOTFOUND) tenant ... not found`
 * and the whole site is down until someone opens the dashboard to resume it.
 *
 * This is a free-plan stopgap: paid projects are never auto-paused, so drop
 * the route + the vercel.json cron entry the day this moves to a paid plan.
 */

/**
 * Idempotent DDL. Also lives in ensure-schema.ts (which runs on every server
 * boot); duplicated here so the route can heal a database where the table is
 * missing without waiting for a cold start.
 *
 * Singleton by construction: `id` defaults to 1 and a CHECK pins it there, so
 * the table can only ever hold the one counter row.
 */
export const KEEP_ALIVE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "keep_alive" (
     "id" smallint PRIMARY KEY DEFAULT 1,
     "ticks" integer NOT NULL DEFAULT 0,
     "last_ping_at" timestamptz NOT NULL DEFAULT now(),
     "source" text,
     "created_at" timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT "keep_alive_singleton" CHECK ("id" = 1)
   )`,
  `INSERT INTO "keep_alive" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`,
  // RLS on, zero policies: only the server touches this row (direct Postgres
  // as the table owner, which bypasses RLS), so the public anon key can
  // neither read nor bump the counter through PostgREST.
  `ALTER TABLE "keep_alive" ENABLE ROW LEVEL SECURITY`,
]

export type KeepAlivePing = {
  ticks: number
  lastPingAt: string
  /** true when the ping had to create the table before counting. */
  healed: boolean
}

type PingRow = { ticks: number | string; last_ping_at: Date | string }

/** postgres.js returns a rows array; be tolerant of a driver that wraps it. */
function firstRow(result: unknown): PingRow | undefined {
  if (Array.isArray(result)) return result[0] as PingRow | undefined
  const rows = (result as { rows?: unknown[] } | null)?.rows
  return Array.isArray(rows) ? (rows[0] as PingRow | undefined) : undefined
}

/**
 * Postgres reports a missing table as SQLSTATE 42P01.
 *
 * Walk the `cause` chain: drizzle wraps driver errors in a DrizzleQueryError
 * whose own `code` is undefined, so the SQLSTATE sits one level down. Checking
 * only the top level silently disabled the self-heal below (caught by the
 * end-to-end test against a real Postgres, 2026-07-30).
 */
function isUndefinedTable(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 4; depth++) {
    if ((e as { code?: string }).code === '42P01') return true
    e = (e as { cause?: unknown }).cause
  }
  return /relation .* does not exist/i.test(
    err instanceof Error ? `${err.message} ${(err.cause as Error)?.message ?? ''}` : String(err)
  )
}

async function upsert(source: string): Promise<PingRow | undefined> {
  return firstRow(
    await db.execute(sql`
      INSERT INTO "keep_alive" ("id", "ticks", "last_ping_at", "source")
      VALUES (1, 1, now(), ${source})
      ON CONFLICT ("id") DO UPDATE
        SET "ticks" = "keep_alive"."ticks" + 1,
            "last_ping_at" = now(),
            "source" = EXCLUDED."source"
      RETURNING "ticks", "last_ping_at"
    `)
  )
}

/**
 * +1 on the keep-alive counter. Throws if the database is unreachable — the
 * caller turns that into a 503 so the scheduler's own failure log shows it.
 *
 * @param source free-text label for who pinged (`vercel-cron`, `manual`, …),
 *               stored on the row so a stale counter is traceable.
 */
export async function pingKeepAlive(source: string): Promise<KeepAlivePing> {
  let healed = false
  let row: PingRow | undefined

  try {
    row = await upsert(source)
  } catch (err) {
    // Virgin database (fresh Supabase project, or the table was dropped):
    // create it and count this ping. Any other error is a real failure.
    if (!isUndefinedTable(err)) throw err
    for (const statement of KEEP_ALIVE_DDL) {
      await db.execute(sql.raw(statement))
    }
    healed = true
    row = await upsert(source)
  }

  const lastPingAt = row?.last_ping_at ?? new Date()

  return {
    ticks: Number(row?.ticks ?? 0),
    lastPingAt:
      lastPingAt instanceof Date
        ? lastPingAt.toISOString()
        : new Date(lastPingAt).toISOString(),
    healed,
  }
}

/**
 * Cron auth, deliberately permissive when unconfigured.
 *
 * With CRON_SECRET set (Vercel sends it automatically as
 * `Authorization: Bearer $CRON_SECRET`) the secret is required. With no
 * secret set the endpoint stays open instead of failing closed: refusing
 * would silently defeat the one job this route has, and the worst an
 * unauthenticated caller can do is bump a counter. Setting CRON_SECRET in
 * the Vercel project is still recommended.
 */
export function isKeepAliveAuthorized(req: Request): {
  authorized: boolean
  protected: boolean
} {
  const secret = (process.env.CRON_SECRET ?? '').trim()
  if (!secret) return { authorized: true, protected: false }

  const url = new URL(req.url)
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    url.searchParams.get('key') ??
    ''

  return { authorized: provided === secret, protected: true }
}

/** Vercel tags its own cron invocations; useful to log who pinged. */
export function pingSource(req: Request): string {
  return req.headers.get('x-vercel-cron') ? 'vercel-cron' : 'manual'
}
