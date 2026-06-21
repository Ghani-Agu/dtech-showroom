import { NextResponse } from 'next/server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { campaigns, campaignSends } from '@/db/schema'

/**
 * Click redirect — marks the send as clicked on first hit, increments
 * the campaign's click_count, then 302s to the original URL.
 *
 * The original URL is passed as a base64url-encoded `u=` param to keep
 * query-string parsing predictable across mail clients (some mangle
 * unencoded URLs).
 *
 * Safety: we only follow URLs that decode cleanly to http(s) and aren't
 * pointlessly long. Anything else returns 400.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sendId = url.searchParams.get('s')
  const encoded = url.searchParams.get('u')
  if (!encoded || encoded.length > 2_000) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 })
  }

  let target = ''
  try {
    target = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return NextResponse.json({ error: 'bad_encoding' }, { status: 400 })
  }
  if (!/^https?:\/\//i.test(target) || target.length > 2_000) {
    return NextResponse.json({ error: 'bad_target' }, { status: 400 })
  }

  if (sendId && /^[a-f0-9-]{36}$/i.test(sendId)) {
    try {
      const updated = await db
        .update(campaignSends)
        .set({ clickedAt: sql`now()` })
        .where(
          and(eq(campaignSends.id, sendId), isNull(campaignSends.clickedAt))
        )
        .returning({ campaignId: campaignSends.campaignId })
      if (updated[0]?.campaignId) {
        await db
          .update(campaigns)
          .set({ clickCount: sql`${campaigns.clickCount} + 1` })
          .where(eq(campaigns.id, updated[0].campaignId))
      }
    } catch (err) {
      console.warn('[email-track] click log failed:', err)
    }
  }

  return NextResponse.redirect(target, 302)
}
