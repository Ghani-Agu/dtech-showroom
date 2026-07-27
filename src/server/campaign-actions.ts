'use server'

/**
 * campaign-actions — server actions for the admin campaigns surface.
 *
 *   create / update / delete    draft lifecycle (block composer state)
 *   scheduleCampaign            status → 'scheduled' at a future date
 *   runCampaignChunk            one chunk of the resumable send pipeline
 *   sendTestCampaign            single-address render check
 *   searchCampaignProducts      product picker for the composer
 *
 * EVERY action is gated behind requireSection('newsletter') — the same
 * per-section permission model as the rest of the admin (a staff account
 * stripped of the newsletter section can no longer email the whole list).
 */

import { revalidatePath } from 'next/cache'
import { and, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { requireSection } from '@/lib/auth-helpers'
import { db } from '@/db/client'
import {
  brands,
  campaigns,
  campaignSends,
  products,
  type CampaignStatus,
} from '@/db/schema'
import { sendEmail } from '@/lib/mailer'
import { campaignEnvelope } from '@/lib/email-templates'
import { sanitizeCustomHtml } from '@/lib/custom-html'
import {
  blocksToText,
  compileBlocksToHtml,
  defaultBlocks,
  parseBlocks,
  type EmailBlock,
  type EmailProductRef,
} from '@/lib/email-blocks'
import {
  getSiteUrl,
  normalizeAudience,
  processCampaignChunk,
} from './campaign-send-core'
import type { ChunkResult, UpdateCampaignInput } from '@/types/campaigns'

export type CampaignActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

const EDITABLE: CampaignStatus[] = ['draft', 'scheduled', 'failed']

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Strip active content from raw-HTML blocks; pass the rest through. */
function sanitizeBlocks(blocks: EmailBlock[]): EmailBlock[] {
  return blocks.map((b) =>
    b.type === 'html' ? { ...b, html: sanitizeCustomHtml(b.html ?? '') } : b
  )
}

function compile(blocks: EmailBlock[]): { html: string; text: string } {
  const siteUrl = getSiteUrl()
  return {
    html: compileBlocksToHtml(blocks, { siteUrl }),
    text: blocksToText(blocks, { siteUrl }),
  }
}

// ── create ────────────────────────────────────────────────────────
export async function createCampaign(): Promise<CampaignActionResult> {
  try {
    const user = await requireSection('newsletter')
    const blocks = defaultBlocks()
    const { html, text } = compile(blocks)
    const row = await db
      .insert(campaigns)
      .values({
        subject: 'Nouvelle campagne',
        preheader: '',
        bodyHtml: html,
        bodyText: text,
        bodyBlocks: blocks,
        audience: 'all',
        status: 'draft' satisfies CampaignStatus,
        createdBy: user.id,
      })
      .returning({ id: campaigns.id })
    revalidatePath('/admin/campaigns')
    return { ok: true, id: row[0]?.id }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

// ── update (draft / scheduled / failed only) ─────────────────────
export async function updateCampaign(
  input: UpdateCampaignInput
): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
    const id = (input.id ?? '').trim()
    if (!id) return { ok: false, error: 'missing_id' }

    const existing = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!existing) return { ok: false, error: 'not_found' }
    if (!EDITABLE.includes(existing.status)) {
      // A sent campaign is an audit record — its content must keep
      // matching what actually went out.
      return { ok: false, error: 'not_editable' }
    }

    const subject = (input.subject ?? '').slice(0, 200).trim()
    if (!subject) return { ok: false, error: 'subject_required' }
    const preheader = (input.preheader ?? '').slice(0, 200).trim()
    const audience = normalizeAudience(input.audience)
    const blocks = sanitizeBlocks(parseBlocks(input.blocks) ?? [])
    if (blocks.length === 0) return { ok: false, error: 'body_required' }
    const { html, text } = compile(blocks)
    if (!html.trim()) return { ok: false, error: 'body_required' }

    await db
      .update(campaigns)
      .set({
        subject,
        preheader,
        audience,
        bodyBlocks: blocks,
        bodyHtml: html,
        bodyText: text,
        updatedAt: sql`now()`,
      })
      .where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

// ── delete (never a sent/sending campaign — audit trail) ─────────
export async function deleteCampaign(id: string): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
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
    return { ok: false, error: errMsg(err) }
  }
}

// ── schedule / unschedule ────────────────────────────────────────
export async function scheduleCampaign(
  id: string,
  whenIso: string
): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
    const when = new Date(whenIso)
    if (Number.isNaN(when.getTime())) return { ok: false, error: 'invalid_date' }
    const now = Date.now()
    if (when.getTime() < now + 60_000) return { ok: false, error: 'date_in_past' }
    if (when.getTime() > now + 366 * 24 * 3600 * 1000) {
      return { ok: false, error: 'date_too_far' }
    }

    const row = await db
      .select({
        status: campaigns.status,
        subject: campaigns.subject,
        bodyHtml: campaigns.bodyHtml,
      })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'not_found' }
    if (!EDITABLE.includes(row.status)) return { ok: false, error: 'not_editable' }
    if (!row.subject?.trim() || !row.bodyHtml?.trim()) {
      return { ok: false, error: 'missing_subject_or_body' }
    }

    await db
      .update(campaigns)
      .set({
        status: 'scheduled' satisfies CampaignStatus,
        scheduledFor: when,
        updatedAt: sql`now()`,
      })
      .where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

export async function unscheduleCampaign(id: string): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
    const row = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'not_found' }
    if (row.status !== 'scheduled') return { ok: false, error: 'not_scheduled' }
    await db
      .update(campaigns)
      .set({
        status: 'draft' satisfies CampaignStatus,
        scheduledFor: null,
        updatedAt: sql`now()`,
      })
      .where(eq(campaigns.id, id))
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

// ── send: one chunk of the resumable pipeline ────────────────────
export async function runCampaignChunk(id: string): Promise<ChunkResult> {
  await requireSection('newsletter')
  const res = await processCampaignChunk(id)
  if (res.done) {
    revalidatePath('/admin/campaigns')
    revalidatePath(`/admin/campaigns/${id}`)
  }
  return res
}

// ── retry failed recipients ──────────────────────────────────────
/**
 * Clears the errored send rows so the pipeline re-claims exactly those
 * recipients, then flips the campaign back to 'sending'. The client
 * resumes the chunk loop right after.
 */
export async function retryFailedCampaignSends(
  id: string
): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
    const row = await db
      .select({ status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!row) return { ok: false, error: 'not_found' }
    if (row.status !== 'sent' && row.status !== 'failed' && row.status !== 'sending') {
      return { ok: false, error: 'nothing_to_retry' }
    }
    const deleted = await db
      .delete(campaignSends)
      .where(and(eq(campaignSends.campaignId, id), isNotNull(campaignSends.error)))
      .returning({ id: campaignSends.id })
    if (deleted.length === 0) return { ok: false, error: 'nothing_to_retry' }
    await db
      .update(campaigns)
      .set({ status: 'sending' satisfies CampaignStatus, updatedAt: sql`now()` })
      .where(eq(campaigns.id, id))
    revalidatePath(`/admin/campaigns/${id}`)
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

// ── send to a single test address ────────────────────────────────
export async function sendTestCampaign(
  id: string,
  testEmail: string
): Promise<CampaignActionResult> {
  try {
    await requireSection('newsletter')
    const email = (testEmail ?? '').trim()
    if (!email || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email)) {
      return { ok: false, error: 'invalid_email' }
    }
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!campaign) return { ok: false, error: 'not_found' }
    if (!campaign.subject?.trim() || !campaign.bodyHtml?.trim()) {
      return { ok: false, error: 'missing_subject_or_body' }
    }
    const siteUrl = getSiteUrl()
    const tpl = campaignEnvelope({
      siteUrl,
      preheader: campaign.preheader ?? undefined,
      bodyHtml: campaign.bodyHtml,
      bodyText: campaign.bodyText,
      unsubscribeUrl: `${siteUrl}/fr/newsletter/unsubscribe?token=test`,
      subscriberEmail: email,
      locale: 'fr',
    })
    const res = await sendEmail({
      to: email,
      subject: `[Test] ${campaign.subject}`,
      html: tpl.html,
      text: tpl.text,
      replyTo: process.env.NEWSLETTER_REPLY_TO,
      tag: `campaign-test-${id}`,
    })
    return res.ok ? { ok: true } : { ok: false, error: res.error ?? 'send_failed' }
  } catch (err) {
    return { ok: false, error: errMsg(err) }
  }
}

// ── product picker (composer "Produits" block) ───────────────────
export async function searchCampaignProducts(
  query: string
): Promise<EmailProductRef[]> {
  await requireSection('newsletter')
  const q = (query ?? '').trim().slice(0, 80)
  const active = isNull(products.archivedAt)
  const where =
    q.length >= 1
      ? and(
          active,
          or(
            ilike(products.name, `%${q}%`),
            ilike(products.nameFr, `%${q}%`),
            ilike(products.slug, `%${q}%`)
          )
        )
      : active
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      nameFr: products.nameFr,
      tagline: products.tagline,
      taglineFr: products.taglineFr,
      image: products.cardImagePath,
      brand: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where)
    .orderBy(sql`${products.featured} DESC`, products.sortOrder, products.name)
    .limit(12)
  return rows.map((r) => ({
    slug: r.slug,
    name: r.nameFr ?? r.name,
    tagline: r.taglineFr ?? r.tagline,
    image: r.image,
    ...(r.brand ? { brand: r.brand } : {}),
  }))
}
