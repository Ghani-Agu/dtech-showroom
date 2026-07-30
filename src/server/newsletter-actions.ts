'use server'

/**
 * newsletter-actions — server-side actions for the customer newsletter
 * flow: subscribe (double-opt-in), confirm, unsubscribe.
 *
 * All paths defensive: respect honeypot, hash IP for the abuse signal,
 * upsert by email so re-submitting a known address doesn't crash, send
 * confirmation email through the central mailer (dev-stub friendly).
 */

import { revalidatePath } from 'next/cache'
import { createHash, randomBytes } from 'node:crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { campaignSends, subscribers, type SubscriberStatus } from '@/db/schema'
import { sendEmail, isEmailConfigured } from '@/lib/mailer'
import { requireSection } from '@/lib/auth-helpers'
import { getSiteUrl, isPublicSiteUrl } from '@/lib/site-url'
import { confirmationTemplate } from '@/lib/email-templates'
import {
  isBrevoConfigured,
  upsertBrevoContact,
  setBrevoContactBlacklist,
  getBrevoListId,
} from '@/lib/brevo'

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
  /**
   * `pending` / `resent`  — row saved AND the confirmation left the building.
   * `already_subscribed`  — nothing to do.
   * `saved_no_mail`       — ROUND 24. The address IS stored, but the
   *   confirmation could not be sent (no provider, provider rejected, or the
   *   site URL is not publicly reachable so the link would be dead). Never
   *   report this as a plain success: the visitor would sit waiting for an
   *   email that is not coming, and the admin would never know why the list
   *   stopped growing.
   */
  status?: 'pending' | 'already_subscribed' | 'resent' | 'saved_no_mail'
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
  /* Honeypot. ROUND 24 — the field used to be called `website`, which Chrome
     autofill and form-filling extensions recognise and populate: a real
     visitor got silently discarded and told "thanks". The field is now
     `nl_ref_url`, a name nothing autofills, and a trip is LOGGED so this can
     never again be an invisible drop. The old name is still checked so a
     cached page from before this deploy keeps working. */
  const trap =
    String(form.get('nl_ref_url') ?? '') || String(form.get('website') ?? '')
  if (trap.trim().length > 0) {
    console.warn('[newsletter] honeypot tripped — submission discarded')
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

  try {
    return await runSubscribe({ email, locale, source, ipHash })
  } catch (err) {
    /* Was an unhandled throw — the visitor got Next's generic server-action
       error with no clue, and nothing was logged anywhere he would look. */
    console.error('[newsletter] subscribe failed:', err)
    return { ok: false, errors: { _form: ['generic'] } }
  }
}

async function runSubscribe({
  email,
  locale,
  source,
  ipHash,
}: {
  email: string
  locale: string
  source: string
  ipHash: string | null
}): Promise<NewsletterActionResult> {
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
    const sent = await sendConfirmation(email, confirmToken, locale)
    return { ok: true, status: sent.ok ? 'pending' : 'saved_no_mail' }
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
  const sent = await sendConfirmation(email, confirmToken, locale)
  return { ok: true, status: sent.ok ? 'resent' : 'saved_no_mail' }
}

/**
 * Send the double-opt-in confirmation.
 *
 * ROUND 24 — this used to be `Promise<void>` and threw the result away, so
 * every failure mode below was invisible: no provider key, a provider
 * rejection, or a confirm link pointing at localhost. The subscriber sat at
 * `pending` for ever and, since campaigns only target `subscribed`, silently
 * never existed as far as the marketing screens were concerned.
 */
async function sendConfirmation(
  email: string,
  token: string,
  locale: string
): Promise<{ ok: boolean; error?: string }> {
  const siteUrl = getSiteUrl()

  if (!isPublicSiteUrl(siteUrl)) {
    const error = `NEXT_PUBLIC_SITE_URL is not set — the confirm link would point at ${siteUrl}`
    console.error(`[newsletter] refusing to send to ${email}: ${error}`)
    return { ok: false, error }
  }
  if (!(await isEmailConfigured())) {
    const error = 'no email provider configured (Brevo key or RESEND_API_KEY)'
    console.error(`[newsletter] cannot confirm ${email}: ${error}`)
    return { ok: false, error }
  }

  const confirmUrl = `${siteUrl}/${locale}/newsletter/confirm?token=${encodeURIComponent(token)}`
  const tpl = confirmationTemplate({ siteUrl, confirmUrl, locale })
  const res = await sendEmail({
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
  if (!res.ok) {
    console.error(`[newsletter] confirmation to ${email} failed: ${res.error}`)
  }
  return { ok: res.ok, error: res.error }
}

/** Push a confirmed subscriber into the Brevo contact base (and the
 *  configured list, if any). No-op when no Brevo key is set. */
async function syncSubscriberToBrevo(email: string): Promise<void> {
  try {
    if (!(await isBrevoConfigured())) return
    const listId = await getBrevoListId()
    const res = await upsertBrevoContact(email, {}, listId)
    if (!res.ok) {
      console.warn(`[newsletter] Brevo contact sync failed for ${email}: ${res.error}`)
    }
    // A re-subscriber may have been blacklisted by an earlier unsubscribe.
    await setBrevoContactBlacklist(email, false)
  } catch (err) {
    console.warn('[newsletter] Brevo contact sync error:', err)
  }
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

    // Mirror the confirmed subscriber into Brevo contacts (fire-and-forget
    // — a Brevo hiccup must never break the visitor's confirmation page).
    void syncSubscriberToBrevo(row.email)

    return { ok: true, state: 'subscribed', email: row.email }
  } catch (err) {
    console.error('[newsletter] confirm failed:', err)
    return { ok: false, state: 'error' }
  }
}

export async function unsubscribeByToken(
  token: string,
  /** Optional campaign_sends id (the `s=` param embedded in campaign
   *  unsubscribe links) — lets the campaign record which send triggered
   *  the departure. */
  sendId?: string
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

    // Attribution — only a send row that really belongs to THIS subscriber.
    if (sendId && /^[a-f0-9-]{36}$/i.test(sendId)) {
      db.update(campaignSends)
        .set({ unsubscribedAt: sql`now()` })
        .where(
          and(
            eq(campaignSends.id, sendId),
            eq(campaignSends.subscriberId, row.id)
          )
        )
        .catch(() => {})
    }

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

    // Keep the Brevo contact base coherent (fire-and-forget — a Brevo
    // hiccup must never break the visitor's unsubscribe page).
    void syncUnsubscribeToBrevo(row.email)

    return { ok: true, state: 'unsubscribed', email: row.email }
  } catch (err) {
    console.error('[newsletter] unsubscribe failed:', err)
    return { ok: false, state: 'error' }
  }
}

async function syncUnsubscribeToBrevo(email: string): Promise<void> {
  try {
    if (!(await isBrevoConfigured())) return
    const res = await setBrevoContactBlacklist(email, true)
    if (!res.ok) {
      console.warn(`[newsletter] Brevo blacklist sync failed for ${email}: ${res.error}`)
    }
  } catch (err) {
    console.warn('[newsletter] Brevo blacklist sync error:', err)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUND 24 — admin side of the same flow.

   Double opt-in means a signup only reaches the marketing screens once the
   visitor clicks the link, and campaigns target `subscribed` only. When the
   confirmation email cannot be delivered — no provider key, a rejected send,
   a confirm link that pointed at localhost — every signup piles up as
   `pending` and the list looks dead from the back office. These give the
   admin a way out without touching SQL: see WHY it is stuck, resend, or
   confirm the address by hand.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface NewsletterHealth {
  /** A provider (Brevo key in Réglages, or RESEND_API_KEY) is available. */
  mailConfigured: boolean
  /** Origin the confirm links are being built from. */
  siteUrl: string
  /** False when that origin is localhost — links in real inboxes are dead. */
  siteUrlPublic: boolean
}

export async function getNewsletterHealth(): Promise<NewsletterHealth> {
  /* Exported from a 'use server' module = a public endpoint. Gate it: it
     reports whether the mailer is configured, which is nobody's business. */
  await requireSection('newsletter')
  const siteUrl = getSiteUrl()
  let mailConfigured = false
  try {
    mailConfigured = await isEmailConfigured()
  } catch {
    /* app_settings unreachable — report "not configured" rather than throw,
       this only drives a banner. */
  }
  return { mailConfigured, siteUrl, siteUrlPublic: isPublicSiteUrl(siteUrl) }
}

/** Rotate the token and send the confirmation again. */
export async function resendConfirmationAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSection('newsletter')
    const row = await db
      .select({ id: subscribers.id, email: subscribers.email, locale: subscribers.locale, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'Abonné introuvable' }
    if (row.status === 'subscribed') return { ok: false, error: 'Déjà confirmé' }

    const confirmToken = newToken()
    await db
      .update(subscribers)
      .set({ status: 'pending' satisfies SubscriberStatus, confirmToken, unsubscribedAt: null })
      .where(eq(subscribers.id, row.id))

    const sent = await sendConfirmation(row.email, confirmToken, row.locale)
    revalidatePath('/admin/subscribers')
    return sent.ok ? { ok: true } : { ok: false, error: sent.error ?? "L'e-mail n'est pas parti" }
  } catch (err) {
    console.error('[newsletter] resend failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}

/**
 * Confirm an address from the back office.
 *
 * Deliberately manual and one at a time: this is consent, not a bulk import.
 * Use it for people who signed up while the mailer was broken, or who tell
 * you in person / on WhatsApp that they want the newsletter.
 */
export async function confirmSubscriberAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSection('newsletter')
    const row = await db
      .select({ id: subscribers.id, email: subscribers.email, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'Abonné introuvable' }
    if (row.status === 'subscribed') return { ok: true }

    await db
      .update(subscribers)
      .set({
        status: 'subscribed' satisfies SubscriberStatus,
        confirmToken: null,
        confirmedAt: sql`now()`,
        unsubscribedAt: null,
      })
      .where(eq(subscribers.id, row.id))

    void syncSubscriberToBrevo(row.email)
    revalidatePath('/admin/subscribers')
    return { ok: true }
  } catch (err) {
    console.error('[newsletter] manual confirm failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Échec' }
  }
}
