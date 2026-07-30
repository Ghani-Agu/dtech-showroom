import { NextResponse } from 'next/server'
import {
  isKeepAliveAuthorized,
  pingKeepAlive,
  pingSource,
} from '@/server/keep-alive'

/**
 * Supabase keep-alive tick — `keep_alive.ticks += 1`.
 *
 * Called daily by the Vercel cron (vercel.json). Any external scheduler works
 * too, which is the fallback if a Vercel deploy ever breaks:
 *   GET /api/cron/keep-alive        with  Authorization: Bearer $CRON_SECRET
 *   GET /api/cron/keep-alive?key=$CRON_SECRET
 *
 * Safe to open in a browser to check the counter. See src/server/keep-alive.ts
 * for why this writes instead of running `SELECT 1`.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function tick(req: Request) {
  const { authorized, protected: isProtected } = isKeepAliveAuthorized(req)
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    const ping = await pingKeepAlive(pingSource(req))
    return NextResponse.json(
      {
        ok: true,
        project: 'dtech-showroom',
        ...ping,
        pingMs: Date.now() - startedAt,
        protected: isProtected,
      },
      { headers: { 'cache-control': 'no-store' } }
    )
  } catch (err) {
    // 503 (not 200) on purpose: the scheduler's failure log is the only
    // monitoring this has.
    return NextResponse.json(
      {
        ok: false,
        project: 'dtech-showroom',
        error: err instanceof Error ? err.message : String(err),
        pingMs: Date.now() - startedAt,
      },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    )
  }
}

export const GET = tick
export const POST = tick
