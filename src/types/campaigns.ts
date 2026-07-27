/**
 * Shared campaign pipeline types — in their own dependency-free module so
 * BOTH server modules (campaign-send-core, campaign-actions) and client
 * components (SendPanel, CampaignEditor) can import them.
 *
 * Round-9 lesson repeated by round 11: never re-export types from a
 * 'use server' module (`export type { X }` there becomes a runtime
 * `registerServerReference(X)` under Turbopack → ReferenceError on boot),
 * and never make clients import values from server-only modules. Plain
 * type modules like this one are the safe meeting point.
 */

export type CampaignStatusValue =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'

export interface AudienceCounts {
  all: number
  fr: number
  en: number
  ar: number
}

export interface CampaignProgress {
  audienceTotal: number
  processed: number
  sent: number
  failed: number
}

export interface ChunkResult extends CampaignProgress {
  ok: boolean
  error?: string
  /** True once every audience member has a send row (campaign finalized). */
  done: boolean
  status: CampaignStatusValue
  chunkSent: number
  chunkFailed: number
}

export interface UpdateCampaignInput {
  id: string
  subject: string
  preheader: string
  audience: string
  /** Composer blocks — validated server-side with parseBlocks(). */
  blocks: unknown
}
