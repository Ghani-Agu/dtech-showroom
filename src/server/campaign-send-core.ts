import 'server-only'

/**
 * campaign-send-core — the resumable, chunked campaign send pipeline.
 *
 * Plain server module (NOT 'use server') so it can be called from BOTH the
 * admin server actions (campaign-actions.ts, which add the permission
 * gate) and the cron route (/api/cron/campaigns, which authenticates with
 * CRON_SECRET).
 *
 * Why chunks: the old implementation sent the ENTIRE list inside one
 * server-action invocation — a few hundred subscribers blew past the
 * serverless time limit, the function died mid-loop, the campaign stayed
 * 'sending' forever and retrying double-sent everyone it had already
 * reached. Now:
 *
 *   - campaign_sends has a UNIQUE (campaign_id, subscriber_id) index; a
 *     recipient is claimed with INSERT … ON CONFLICT DO NOTHING, so a
 *     retry (or a concurrent worker) can never send twice.
 *   - each call processes one small chunk (default 20) well inside any
 *     serverless budget and reports progress; the client (or cron) calls
 *     again until `done`.
 *   - an interrupted campaign resumes exactly where it stopped — the
 *     chunk query picks subscribers with no send row yet.
 */

import { after } from 'next/server'
import { and, count, eq, isNotNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { isDbUnavailable } from '@/db/health'
import {
  campaigns,
  campaignSends,
  subscribers,
  type Campaign,
  type CampaignStatus,
} from '@/db/schema'
import { sendEmail } from '@/lib/mailer'
import { campaignEnvelope } from '@/lib/email-templates'
import { rewriteLinksForTracking } from '@/lib/email-tracking'
import type { CampaignAudience } from '@/lib/email-blocks'
import type {
  AudienceCounts,
  CampaignProgress,
  ChunkResult,
} from '@/types/campaigns'

export function getSiteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const prod = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim()
  if (prod) return `https://${prod}`
  return 'http://localhost:3000'
}

/** 'fr' | 'en' | 'ar' route segment for a stored subscriber locale. */
export function normalizeLocale(locale: string | null | undefined): 'fr' | 'en' | 'ar' {
  const two = (locale ?? 'fr').slice(0, 2).toLowerCase()
  return two === 'en' || two === 'ar' ? two : 'fr'
}

export function normalizeAudience(value: string | null | undefined): CampaignAudience {
  return value === 'fr' || value === 'en' || value === 'ar' ? value : 'all'
}

/** WHERE fragment for confirmed subscribers of a campaign's audience. */
function audienceCondition(audience: CampaignAudience) {
  const base = eq(subscribers.status, 'subscribed')
  if (audience === 'all') return base
  return and(base, sql`${subscribers.locale} ILIKE ${audience + '%'}`)
}

export async function getAudienceCounts(): Promise<AudienceCounts> {
  const rows = await db
    .select({ locale: subscribers.locale, c: count() })
    .from(subscribers)
    .where(eq(subscribers.status, 'subscribed'))
    .groupBy(subscribers.locale)
  const out: AudienceCounts = { all: 0, fr: 0, en: 0, ar: 0 }
  for (const row of rows) {
    const n = Number(row.c)
    out.all += n
    const key = normalizeLocale(row.locale)
    out[key] += n
  }
  return out
}

export async function getCampaignProgress(
  campaign: Pick<Campaign, 'id' | 'audience'>
): Promise<CampaignProgress> {
  const audience = normalizeAudience(campaign.audience)
  const [audRow, processedRow, failedRow] = await Promise.all([
    db.select({ c: count() }).from(subscribers).where(audienceCondition(audience)),
    db
      .select({ c: count() })
      .from(campaignSends)
      .where(eq(campaignSends.campaignId, campaign.id)),
    db
      .select({ c: count() })
      .from(campaignSends)
      .where(
        and(eq(campaignSends.campaignId, campaign.id), isNotNull(campaignSends.error))
      ),
  ])
  const processed = Number(processedRow[0]?.c ?? 0)
  const failed = Number(failedRow[0]?.c ?? 0)
  return {
    audienceTotal: Number(audRow[0]?.c ?? 0),
    processed,
    failed,
    sent: processed - failed,
  }
}

const CHUNK_SIZE = 20
/** Parallel sends inside a chunk — stays politely under Brevo's rate cap. */
const GROUP_SIZE = 5
const GROUP_GAP_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Process one chunk of a campaign send. Safe to call repeatedly and
 * concurrently; call until `done` is true.
 */
export async function processCampaignChunk(
  campaignId: string,
  opts: { chunkSize?: number } = {}
): Promise<ChunkResult> {
  const chunkSize = Math.min(50, Math.max(1, opts.chunkSize ?? CHUNK_SIZE))

  const campaign = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1)
    .then((r) => r[0])

  if (!campaign) {
    return {
      ok: false,
      error: 'not_found',
      done: true,
      status: 'failed',
      audienceTotal: 0,
      processed: 0,
      sent: 0,
      failed: 0,
      chunkSent: 0,
      chunkFailed: 0,
    }
  }

  const progressOf = async (): Promise<CampaignProgress> =>
    getCampaignProgress({ id: campaign.id, audience: campaign.audience })

  if (campaign.status === 'sent') {
    const p = await progressOf()
    return { ok: true, done: true, status: 'sent', ...p, chunkSent: 0, chunkFailed: 0 }
  }
  if (!campaign.subject?.trim() || !campaign.bodyHtml?.trim()) {
    const p = await progressOf()
    return {
      ok: false,
      error: 'missing_subject_or_body',
      done: false,
      status: campaign.status,
      ...p,
      chunkSent: 0,
      chunkFailed: 0,
    }
  }

  const siteUrl = getSiteUrl()
  const audience = normalizeAudience(campaign.audience)

  // Mark sending (also stamps updatedAt — the cron's stuck-detector clock).
  await db
    .update(campaigns)
    .set({ status: 'sending' satisfies CampaignStatus, updatedAt: sql`now()` })
    .where(eq(campaigns.id, campaignId))

  // Claim the next recipients: audience members with no send row yet.
  const chunk = await db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      locale: subscribers.locale,
      unsubscribeToken: subscribers.unsubscribeToken,
    })
    .from(subscribers)
    .where(
      and(
        audienceCondition(audience),
        sql`NOT EXISTS (
          SELECT 1 FROM ${campaignSends}
          WHERE ${campaignSends.campaignId} = ${campaignId}
            AND ${campaignSends.subscriberId} = ${subscribers.id}
        )`
      )
    )
    .orderBy(subscribers.createdAt)
    .limit(chunkSize)

  let chunkSent = 0
  let chunkFailed = 0

  for (let i = 0; i < chunk.length; i += GROUP_SIZE) {
    const group = chunk.slice(i, i + GROUP_SIZE)
    await Promise.all(
      group.map(async (r) => {
        // Claim — ON CONFLICT means a concurrent worker already has it.
        const inserted = await db
          .insert(campaignSends)
          .values({ campaignId, subscriberId: r.id })
          .onConflictDoNothing({
            target: [campaignSends.campaignId, campaignSends.subscriberId],
          })
          .returning({ id: campaignSends.id })
        const sendId = inserted[0]?.id
        if (!sendId) return

        const loc = normalizeLocale(r.locale)
        const unsubscribeUrl = `${siteUrl}/${loc}/newsletter/unsubscribe?token=${encodeURIComponent(r.unsubscribeToken)}&s=${sendId}`
        const trackingPixelUrl = `${siteUrl}/api/email/track/open?s=${sendId}`
        const tpl = campaignEnvelope({
          siteUrl,
          preheader: campaign.preheader ?? undefined,
          bodyHtml: rewriteLinksForTracking(campaign.bodyHtml, sendId, siteUrl),
          bodyText: campaign.bodyText,
          unsubscribeUrl,
          subscriberEmail: r.email,
          locale: loc,
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
          tag: `campaign-${campaignId}`,
        })
        if (res.ok) {
          chunkSent += 1
        } else {
          chunkFailed += 1
          await db
            .update(campaignSends)
            .set({ error: (res.error ?? 'unknown').slice(0, 500) })
            .where(eq(campaignSends.id, sendId))
        }
      })
    )
    if (i + GROUP_SIZE < chunk.length) await sleep(GROUP_GAP_MS)
  }

  const progress = await progressOf()
  const done = progress.processed >= progress.audienceTotal

  if (done) {
    const finalStatus: CampaignStatus =
      progress.audienceTotal > 0 && progress.sent === 0 ? 'failed' : 'sent'
    await db
      .update(campaigns)
      .set({
        status: finalStatus,
        sentAt: sql`COALESCE(${campaigns.sentAt}, now())`,
        sentCount: progress.sent,
        updatedAt: sql`now()`,
      })
      .where(eq(campaigns.id, campaignId))
    return {
      ok: true,
      done: true,
      status: finalStatus,
      ...progress,
      chunkSent,
      chunkFailed,
    }
  }

  await db
    .update(campaigns)
    .set({ sentCount: progress.sent, updatedAt: sql`now()` })
    .where(eq(campaigns.id, campaignId))

  return {
    ok: true,
    done: false,
    status: 'sending',
    ...progress,
    chunkSent,
    chunkFailed,
  }
}

/* ── Round 15: traffic-driven scheduler poke ─────────────────────────
 * "Programmer" now fires AT the chosen date/time without paid cron: any
 * storefront or admin render calls pokeCampaignScheduler(); at most once
 * per 60s per server instance it schedules an after-response check that
 * advances due campaigns for up to ~6s (the chunked pipeline makes any
 * partial progress safe and resumable). The daily Vercel cron and/or an
 * external cron hitting /api/cron/campaigns remain the backstop for
 * traffic-free periods.
 */
let lastPokeAt = 0

export function pokeCampaignScheduler(): void {
  // A known-down database gets no extra traffic: the poke would queue behind
  // the same dead connection the render is already waiting on, and its
  // failure log buried the useful lines. It resumes on its own once the
  // breaker closes.
  if (isDbUnavailable()) return
  const now = Date.now()
  if (now - lastPokeAt < 60_000) return
  lastPokeAt = now
  try {
    after(async () => {
      try {
        const summaries = await processDueCampaigns(6_000)
        if (summaries.length > 0) {
          console.log(
            `[campaigns] poke advanced ${summaries.length} due campaign(s):`,
            summaries.map((s) => `${s.subject} (${s.reason}, sent ${s.sent})`).join(' · ')
          )
        }
      } catch (err) {
        console.warn('[campaigns] scheduler poke failed:', err)
      }
    })
  } catch {
    // after() needs a request scope — during build/prerender there is none.
    lastPokeAt = 0
  }
}

export interface DueCampaignSummary {
  campaignId: string
  subject: string
  reason: 'scheduled' | 'stuck'
  done: boolean
  sent: number
  failed: number
}

/**
 * Cron entry point: advance every campaign that should be moving —
 * scheduled ones whose time has come, and 'sending' ones that stopped
 * getting chunks (admin closed the tab / function died) more than
 * 10 minutes ago. Processes chunks until `budgetMs` is spent.
 */
export async function processDueCampaigns(
  budgetMs = 40_000
): Promise<DueCampaignSummary[]> {
  const startedAt = Date.now()
  const due = await db
    .select({ id: campaigns.id, subject: campaigns.subject, status: campaigns.status })
    .from(campaigns)
    .where(
      sql`(${and(
        eq(campaigns.status, 'scheduled'),
        isNotNull(campaigns.scheduledFor),
        lte(campaigns.scheduledFor, sql`now()`)
      )}) OR (${and(
        eq(campaigns.status, 'sending'),
        lt(campaigns.updatedAt, sql`now() - interval '10 minutes'`)
      )})`
    )
    .orderBy(campaigns.scheduledFor)
    .limit(10)

  const summaries: DueCampaignSummary[] = []
  for (const c of due) {
    const summary: DueCampaignSummary = {
      campaignId: c.id,
      subject: c.subject,
      reason: c.status === 'scheduled' ? 'scheduled' : 'stuck',
      done: false,
      sent: 0,
      failed: 0,
    }
    for (;;) {
      const res = await processCampaignChunk(c.id)
      summary.sent = res.sent
      summary.failed = res.failed
      summary.done = res.done
      if (!res.ok || res.done) break
      if (Date.now() - startedAt > budgetMs) break
    }
    summaries.push(summary)
    if (Date.now() - startedAt > budgetMs) break
  }
  return summaries
}
