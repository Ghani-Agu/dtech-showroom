import { NextResponse } from 'next/server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { campaigns, campaignSends } from '@/db/schema'
import { verifyClickToken } from '@/lib/email-tracking'

/**
 * Click redirect — marks the send as clicked on first hit, increments
 * the campaign's click_count, then 302s to the original URL.
 *
 * The original URL is passed as a base64url-encoded `u=` param to keep
 * query-string parsing predictable across mail clients (some mangle
 * unencoded URLs).
 *
 * Safety: every link is HMAC-signed at send time (lib/email-tracking).
 * Without a valid `sig` for this exact (sendId, url) pair the endpoint
 * refuses — otherwise it would be an open redirect on our domain
 * (phishing mails could bounce through d-techalgerie.com).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sendId = url.searchParams.get('s')
  const encoded = url.searchParams.get('u')
  const sig = url.searchParams.get('sig') ?? ''
  if (!encoded || encoded.length > 2_000) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 })
  }
  if (!sendId || !/^[a-f0-9-]{36}$/i.test(sendId)) {
    return NextResponse.json({ error: 'missing_send' }, { status: 400 })
  }
  if (!verifyClickToken(sendId, encoded, sig)) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 403 })
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

  {
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
