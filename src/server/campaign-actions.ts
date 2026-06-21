'use server'

/**
 * campaign-actions — server actions for the admin campaigns surface.
 *
 *   - create / update / delete (draft only)
 *   - sendCampaign:    immediate send to all currently-subscribed addresses
 *   - sendTestCampaign: send to a single email address (admin's own)
 *
 * All actions are gated behind a better-auth session check via the helper
 * `requireSession`. Anything that mutates state revalidates the relevant
 * admin paths so the list refreshes.
 */

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import {
  campaigns,
  campaignSends,
  subscribers,
  type CampaignStatus,
} from '@/db/schema'
import { sendBatch, sendEmail } from '@/lib/mailer'
import { campaignEnvelope } from '@/lib/email-templates'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

async function requireSession() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) throw new Error('unauthorized')
  return session
}

export type CampaignActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

// ── create ────────────────────────────────────────────────────────
export async function createCampaign(): Promise<CampaignActionResult> {
  try {
    const session = await requireSession()
    const userId = (session.user.id as string | undefined) ?? null
    const row = await db
      .insert(campaigns)
      .values({
        subject: 'Nouvelle campagne',
        preheader: '',
        bodyHtml: '<p>Écrivez votre message ici…</p>',
        bodyText: '',
        audience: 'all',
        status: 'draft' satisfies CampaignStatus,
        createdBy: userId ?? undefined,
      })
      .returning({ id: campaigns.id })
    revalidatePath('/admin/campaigns')
    return { ok: true, id: row[0]?.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── update ────────────────────────────────────────────────────────
export async function updateCampaign(
  _prev: CampaignActionResult | null,
  form: FormData
): Promise<CampaignActionResult> {
  try {
    await requireSession()
    const id = String(form.get('id') ?? '')
    if (!id) return { ok: false, error: 'missing_id' }
    const subject = String(form.get('subject') ?? '').slice(0, 200).trim()
    const preheader = String(form.get('preheader') ?? '').slice(0, 200).trim()
    const bodyHtml = String(form.get('bodyHtml') ?? '').slice(0, 100_000)
    const bodyText = String(form.get('bodyText') ?? '').slice(0, 100_000)
    if (!subject) return { ok: false, error: 'subject_required' }

    await db
      .update(campaigns)
      .set({
        subject,
        preheader,
        bodyHtml,
        bodyText,
        updatedAt: sql`now()`,
      })
      .where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── delete (draft only — sent campaigns are kept for audit) ──────
export async function deleteCampaign(id: string): Promise<CampaignActionResult> {
  try {
    await requireSession()
    const row = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'not_found' }
    if (row.status === 'sent' || row.status === 'sending') {
      return { ok: false, error: 'cannot_delete_sent' }
    }
    await db.delete(campaigns).where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── send (immediate, in-process batching) ────────────────────────
export async function sendCampaign(id: string): Promise<CampaignActionResult> {
  try {
    await requireSession()
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!campaign) return { ok: false, error: 'not_found' }
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return { ok: false, error: 'already_sending' }
    }
    if (!campaign.subject || !campaign.bodyHtml) {
      return { ok: false, error: 'missing_subject_or_body' }
    }

    // Mark sending — short-lived state, lets the UI show "envoi en cours".
    await db
      .update(campaigns)
      .set({ status: 'sending' satisfies CampaignStatus })
      .where(eq(campaigns.id, id))

    const recipients = await db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        unsubscribeToken: subscribers.unsubscribeToken,
      })
      .from(subscribers)
      .where(eq(subscribers.status, 'subscribed'))

    let sentOk = 0
    let sentErr = 0
    const sendInsertRows: Array<{ campaignId: string; subscriberId: string; error?: string | null }> = []

    // Pre-create campaign_sends rows so the tracking endpoints have an id
    // to target. We need the id to embed in the open pixel + click links.
    // Insert one row at a time with returning(); not the fastest, but the
    // simplest and the audiences we'll hit in V1 are small.
    for (const r of recipients) {
      const row = await db
        .insert(campaignSends)
        .values({ campaignId: id, subscriberId: r.id })
        .returning({ id: campaignSends.id })
      const sendId = row[0]?.id
      if (!sendId) continue

      const unsubscribeUrl = `${SITE_URL}/fr/newsletter/unsubscribe?token=${encodeURIComponent(r.unsubscribeToken)}`
      const trackingPixelUrl = `${SITE_URL}/api/email/track/open?s=${sendId}`
      const rewrittenBody = rewriteLinksForTracking(campaign.bodyHtml, sendId)

      const tpl = campaignEnvelope({
        siteUrl: SITE_URL,
        preheader: campaign.preheader ?? undefined,
        bodyHtml: rewrittenBody,
        unsubscribeUrl,
        subscriberEmail: r.email,
        trackingPixelUrl,
      })

      const res = await sendEmail({
        to: r.email,
        subject: campaign.subject,
        html: tpl.html,
        text: tpl.text,
        replyTo: process.env.NEWSLETTER_REPLY_TO,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tag: `campaign-${id}`,
      })
      if (res.ok) {
        sentOk += 1
      } else {
        sentErr += 1
        await db
          .update(campaignSends)
          .set({ error: res.error?.slice(0, 500) ?? 'unknown' })
          .where(eq(campaignSends.id, sendId))
      }
      sendInsertRows.push({
        campaignId: id,
        subscriberId: r.id,
        error: res.ok ? null : res.error?.slice(0, 500) ?? 'unknown',
      })
    }

    await db
      .update(campaigns)
      .set({
        status: sentErr === recipients.length && recipients.length > 0
          ? 'failed'
          : 'sent',
        sentAt: sql`now()`,
        sentCount: sentOk,
      })
      .where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    await db
      .update(campaigns)
      .set({ status: 'failed' satisfies CampaignStatus })
      .where(eq(campaigns.id, id))
      .catch(() => {})
    return { ok: false, error: String(err) }
  }
}

// ── send to a single test address (admin's own) ──────────────────
export async function sendTestCampaign(
  id: string,
  testEmail: string
): Promise<CampaignActionResult> {
  try {
    await requireSession()
    if (!testEmail || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(testEmail)) {
      return { ok: false, error: 'invalid_email' }
    }
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!campaign) return { ok: false, error: 'not_found' }
    const tpl = campaignEnvelope({
      siteUrl: SITE_URL,
      preheader: campaign.preheader ?? undefined,
      bodyHtml: campaign.bodyHtml,
      unsubscribeUrl: `${SITE_URL}/fr/newsletter/unsubscribe?token=test`,
      subscriberEmail: testEmail,
    })
    const res = await sendEmail({
      to: testEmail,
      subject: `[Test] ${campaign.subject}`,
      html: tpl.html,
      text: tpl.text,
      tag: `campaign-test-${id}`,
    })
    return res.ok ? { ok: true } : { ok: false, error: res.error ?? 'send_failed' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Wrap every <a href="..."> in the campaign body with a tracker URL.
 * We don't try to be precious about edge cases (data: URIs, etc.) —
 * if the original href doesn't start with http(s)://, leave it alone.
 */
function rewriteLinksForTracking(html: string, sendId: string): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
    (_m, before, q, url, after) => {
      const wrapped = `${SITE_URL}/api/email/track/click?s=${sendId}&u=${encodeURIComponent(
        Buffer.from(url, 'utf8').toString('base64url')
      )}`
      return `<a ${before}href=${q}${wrapped}${q}${after}>`
    }
  )
}

// keep the unused helper from triggering a lint warning
void sendBatch
