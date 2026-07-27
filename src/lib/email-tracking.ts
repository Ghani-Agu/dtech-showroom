import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * email-tracking.ts — signed click-tracking URLs for campaigns.
 *
 * The click endpoint used to be an OPEN REDIRECT: anyone could craft
 * /api/email/track/click?u=<base64(evil)> and get a 302 from our domain.
 * Every tracked link now carries an HMAC of (sendId + encoded URL); the
 * endpoint refuses to redirect unless the signature verifies, so only
 * URLs we generated at send time redirect.
 *
 * Secret: BETTER_AUTH_SECRET (already required in prod for auth).
 */

function secret(): string {
  return (
    process.env.EMAIL_TRACKING_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    'dev-only-secret-change-in-production'
  )
}

export function signClickToken(sendId: string, encodedUrl: string): string {
  return createHmac('sha256', secret())
    .update(`${sendId}.${encodedUrl}`)
    .digest('base64url')
    .slice(0, 24)
}

export function verifyClickToken(
  sendId: string,
  encodedUrl: string,
  sig: string
): boolean {
  if (!sig || sig.length > 64) return false
  const expected = signClickToken(sendId, encodedUrl)
  const a = Buffer.from(expected)
  const b = Buffer.from(sig)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function buildClickUrl(
  siteUrl: string,
  sendId: string,
  targetUrl: string
): string {
  const encoded = Buffer.from(targetUrl, 'utf8').toString('base64url')
  const sig = signClickToken(sendId, encoded)
  return `${siteUrl}/api/email/track/click?s=${sendId}&u=${encodeURIComponent(encoded)}&sig=${sig}`
}

/**
 * Wrap every absolute http(s) <a href> in the campaign body with a signed
 * tracker URL. Relative/mailto/tel links are left alone. The unsubscribe
 * link lives in the envelope footer (added AFTER this rewrite), so it is
 * never wrapped — one-click unsubscribe must not depend on the tracker.
 */
export function rewriteLinksForTracking(
  html: string,
  sendId: string,
  siteUrl: string
): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
    (_m, before, q, url, after) => {
      // Never wrap links that already point at the tracker or unsubscribe.
      if (url.includes('/api/email/track/') || url.includes('/newsletter/unsubscribe')) {
        return `<a ${before}href=${q}${url}${q}${after}>`
      }
      const wrapped = buildClickUrl(siteUrl, sendId, url)
      return `<a ${before}href=${q}${wrapped}${q}${after}>`
    }
  )
}
