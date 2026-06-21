'use server'

/**
 * newsletter-actions — server-side actions for the customer newsletter
 * flow: subscribe (double-opt-in), confirm, unsubscribe.
 *
 * All paths defensive: respect honeypot, hash IP for the abuse signal,
 * upsert by email so re-submitting a known address doesn't crash, send
 * confirmation email through the central mailer (dev-stub friendly).
 */

import { createHash, randomBytes } from 'node:crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { subscribers, type SubscriberStatus } from '@/db/schema'
import { sendEmail } from '@/lib/mailer'
import { confirmationTemplate } from '@/lib/email-templates'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

/** Upstash ratelimit — 5 subscribe attempts per IP per hour. */
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: false,
      })
    : null

export interface NewsletterActionResult {
  ok: boolean
  status?: 'pending' | 'already_subscribed' | 'resent'
  errors?: { _form?: string[]; email?: string[] }
}

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

function readIp(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    null
  )
}

/**
 * Subscribe — public form action.
 *
 * Honeypot: if the `website` field is filled, silently succeed.
 * Validation: simple email regex + length cap.
 * Rate limit: 5/h per IP when Upstash is configured.
 * Behaviour by current state:
 *   - no row             → insert pending + send confirmation
 *   - row pending        → rotate token + send confirmation again
 *   - row subscribed     → return `already_subscribed` (no email)
 *   - row unsubscribed   → flip back to pending + new token + send
 */
export async function subscribeAction(
  _prev: NewsletterActionResult | null,
  form: FormData
): Promise<NewsletterActionResult> {
  // Honeypot — silently pretend success without writing anything.
  if (typeof form.get('website') === 'string' && (form.get('website') as string).length > 0) {
    return { ok: true, status: 'pending' }
  }

  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const locale = (String(form.get('locale') ?? 'fr') || 'fr').slice(0, 5)
  const source = String(form.get('source') ?? 'footer').slice(0, 60)

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return {
      ok: false,
      errors: { email: ['invalid_email'] },
    }
  }

  // Rate limit (best-effort).
  if (ratelimit) {
    try {
      const { headers } = await import('next/headers')
      const h = await headers()
      const ip = readIp(h) ?? 'no-ip'
      const { success } = await ratelimit.limit(`nl-sub:${ip}`)
      if (!success) {
        return { ok: false, errors: { _form: ['rate_limited'] } }
      }
    } catch {
      /* headers() outside a request context — skip */
    }
  }

  // Best-effort IP hash for abuse audit.
  let ipHash: string | null = null
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    ipHash = hashIp(readIp(h))
  } catch {
    /* ignore */
  }

  // Look up existing row.
  const existing = await db
    .select({
      id: subscribers.id,
      status: subscribers.status,
    })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1)
    .then((rows) => rows[0])

  const confirmToken = newToken()
  const unsubscribeToken = newToken()

  if (!existing) {
    await db.insert(subscribers).values({
      email,
      locale,
      status: 'pending' satisfies SubscriberStatus,
      confirmToken,
      unsubscribeToken,
      source,
      ipHash,
    })
    await sendConfirmation(email, confirmToken, locale)
    return { ok: true, status: 'pending' }
  }

  if (existing.status === 'subscribed') {
    // Don't reveal a re-subscribe loop — just say "ok".
    return { ok: true, status: 'already_subscribed' }
  }

  // pending / unsubscribed / bounced → rotate token + send again
  await db
    .update(subscribers)
    .set({
      status: 'pending' satisfies SubscriberStatus,
      confirmToken,
      locale,
      ipHash,
      unsubscribedAt: null,
    })
    .where(eq(subscribers.id, existing.id))
  await sendConfirmation(email, confirmToken, locale)
  return { ok: true, status: 'resent' }
}

async function sendConfirmation(
  email: string,
  token: string,
  locale: string
): Promise<void> {
  const confirmUrl = `${SITE_URL}/${locale}/newsletter/confirm?token=${encodeURIComponent(token)}`
  const tpl = confirmationTemplate({ siteUrl: SITE_URL, confirmUrl, locale })
  await sendEmail({
    to: email,
    subject:
      locale === 'en'
        ? 'Confirm your D-Tech newsletter subscription'
        : locale === 'ar'
          ? 'تأكيد اشتراكك في نشرة D-Tech'
          : 'Confirmez votre inscription à la newsletter D-Tech',
    html: tpl.html,
    text: tpl.text,
    tag: 'newsletter-confirm',
  })
}

/* ── confirm / unsubscribe — token consumption ────────────────────────
 * These are called by GET pages, not form actions. They return small
 * status objects the page renders into a friendly outcome.
 */

export interface TokenActionResult {
  ok: boolean
  /** 'subscribed' | 'unsubscribed' | 'already' | 'invalid' | 'error' */
  state: 'subscribed' | 'unsubscribed' | 'already' | 'invalid' | 'error'
  email?: string
}

export async function confirmSubscriptionByToken(
  token: string
): Promise<TokenActionResult> {
  if (!token || typeof token !== 'string' || token.length > 256) {
    return { ok: false, state: 'invalid' }
  }
  try {
    const row = await db
      .select({ id: subscribers.id, email: subscribers.email, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.confirmToken, token))
      .limit(1)
      .then((r) => r[0])
    if (!row) {
      // Token consumed already? Try by unsubscribeToken? No — these are
      // independent. Tell the user "invalid" and let them resubscribe.
      return { ok: false, state: 'invalid' }
    }
    if (row.status === 'subscribed') {
      return { ok: true, state: 'already', email: row.email }
    }
    await db
      .update(subscribers)
      .set({
        status: 'subscribed' satisfies SubscriberStatus,
        confirmToken: null,
        confirmedAt: sql`now()`,
      })
      .where(eq(subscribers.id, row.id))
    return { ok: true, state: 'subscribed', email: row.email }
  } catch (err) {
    console.error('[newsletter] confirm failed:', err)
    return { ok: false, state: 'error' }
  }
}

export async function unsubscribeByToken(
  token: string
): Promise<TokenActionResult> {
  if (!token || typeof token !== 'string' || token.length > 256) {
    return { ok: false, state: 'invalid' }
  }
  try {
    const row = await db
      .select({ id: subscribers.id, email: subscribers.email, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.unsubscribeToken, token))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, state: 'invalid' }
    if (row.status === 'unsubscribed') {
      return { ok: true, state: 'already', email: row.email }
    }
    await db
      .update(subscribers)
      .set({
        status: 'unsubscribed' satisfies SubscriberStatus,
        unsubscribedAt: sql`now()`,
      })
      .where(eq(subscribers.id, row.id))
    return { ok: true, state: 'unsubscribed', email: row.email }
  } catch (err) {
    console.error('[newsletter] unsubscribe failed:', err)
    return { ok: false, state: 'error' }
  }
}
