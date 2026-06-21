import { NextResponse } from 'next/server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { campaigns, campaignSends } from '@/db/schema'

/**
 * Open pixel — 1×1 transparent PNG. Marks the send as opened on first hit
 * and increments the campaign's open_count. Subsequent hits are no-ops
 * because we filter on `opened_at IS NULL`.
 *
 * Public endpoint (no auth) by design — emails fetch this from anywhere.
 * To minimise abuse, we cap on send-id length and silently swallow errors.
 */

// 43-byte 1×1 transparent PNG
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64'
)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sendId = url.searchParams.get('s')
  if (sendId && /^[a-f0-9-]{36}$/i.test(sendId)) {
    try {
      const updated = await db
        .update(campaignSends)
        .set({ openedAt: sql`now()` })
        .where(
          and(eq(campaignSends.id, sendId), isNull(campaignSends.openedAt))
        )
        .returning({ campaignId: campaignSends.campaignId })
      if (updated[0]?.campaignId) {
        await db
          .update(campaigns)
          .set({ openCount: sql`${campaigns.openCount} + 1` })
          .where(eq(campaigns.id, updated[0].campaignId))
      }
    } catch (err) {
      console.warn('[email-track] open log failed:', err)
    }
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Length': String(PIXEL.length),
    },
  })
}
