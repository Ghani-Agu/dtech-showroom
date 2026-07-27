import { NextResponse } from 'next/server'
import { processDueCampaigns } from '@/server/campaign-send-core'

/**
 * Campaign scheduler tick — advances:
 *   - 'scheduled' campaigns whose scheduledFor has passed
 *   - 'sending' campaigns that stalled >10 min (admin closed the tab,
 *     function died mid-send) — the pipeline resumes them exactly where
 *     they stopped (campaign_sends rows are the ledger).
 *
 * Called by the Vercel cron (vercel.json — daily on Hobby; raise the
 * frequency on Pro) and/or any external cron service:
 *   GET /api/cron/campaigns            with  Authorization: Bearer $CRON_SECRET
 *   GET /api/cron/campaigns?key=$CRON_SECRET
 *
 * Refuses to run without CRON_SECRET in production.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET ?? '').trim()
  const url = new URL(req.url)
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    url.searchParams.get('key') ??
    ''

  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 503 })
    }
    if (provided !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  } else if (secret && provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const summaries = await processDueCampaigns(45_000)
    return NextResponse.json({ ok: true, processed: summaries.length, summaries })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
