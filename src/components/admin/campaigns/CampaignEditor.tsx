'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Trash2 } from 'lucide-react'
import type { Campaign } from '@/db/schema'
import { GlassCard } from '@/components/admin/GlassCard'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import { BlockComposer } from './BlockComposer'
import { EnvelopePreview } from './EnvelopePreview'
import { SendPanel, humanCampaignError } from './SendPanel'
import { deleteCampaign, updateCampaign } from '@/server/campaign-actions'
import type { AudienceCounts, CampaignProgress } from '@/types/campaigns'
import {
  legacyBlocksFromHtml,
  parseBlocks,
  type CampaignAudience,
  type EmailBlock,
} from '@/lib/email-blocks'

const inputCls =
  'w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-4 py-2.5 font-body text-[14px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)] disabled:opacity-60'

interface CampaignEditorProps {
  campaign: Campaign
  counts: AudienceCounts
  initialProgress: CampaignProgress
}

export function CampaignEditor({ campaign, counts, initialProgress }: CampaignEditorProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(campaign.subject)
  const [preheader, setPreheader] = useState(campaign.preheader ?? '')
  const [audience, setAudience] = useState<CampaignAudience>(
    campaign.audience === 'fr' || campaign.audience === 'en' || campaign.audience === 'ar'
      ? campaign.audience
      : 'all'
  )
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    const parsed = parseBlocks(campaign.bodyBlocks)
    if (parsed && parsed.length > 0) return parsed
    return campaign.bodyHtml.trim() ? legacyBlocksFromHtml(campaign.bodyHtml) : []
  })
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()

  // Snapshot of the last-saved state — powers the "unsaved changes" logic.
  const savedRef = useRef('')
  const snapshot = useMemo(
    () => JSON.stringify({ subject, preheader, audience, blocks }),
    [subject, preheader, audience, blocks]
  )
  if (savedRef.current === '') {
    savedRef.current = snapshot
  }
  const dirty = snapshot !== savedRef.current

  const editable =
    campaign.status === 'draft' ||
    campaign.status === 'scheduled' ||
    campaign.status === 'failed'

  function save() {
    const payload = { id: campaign.id, subject, preheader, audience, blocks }
    const savedSnapshot = snapshot
    startSaving(async () => {
      const r = await updateCampaign(payload)
      if (r.ok) {
        savedRef.current = savedSnapshot
        toast.success('Campagne enregistrée')
      } else {
        toast.error(humanCampaignError(r.error))
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--c-mint)]">
            Campagne newsletter
          </p>
          <h1 className="mt-1 font-display text-[26px] font-semibold tracking-tight text-[var(--admin-text-primary)]">
            {subject || 'Sans titre'}
          </h1>
          <p className="mt-1 font-body text-[13px] text-[var(--admin-text-secondary)]">
            {counts.all} abonné·e·s confirmé·e·s au total.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && editable && (
            <span className="rounded-full border border-[color-mix(in_oklab,var(--c-amber)_45%,transparent)] bg-[color-mix(in_oklab,var(--c-amber)_10%,transparent)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--c-amber)]">
              Non enregistré
            </span>
          )}
          <CampaignStatusBadge status={campaign.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.05fr_1fr]">
        {/* ── left: meta + composer + sending ─────────────────── */}
        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="space-y-4">
              <Field label="Sujet" hint="200 caractères max — premier élément que voit le client.">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={200}
                  disabled={!editable}
                  className={inputCls}
                />
              </Field>

              <Field
                label="Pré-en-tête"
                hint="Courte phrase affichée après le sujet par Gmail / Outlook."
              >
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  maxLength={200}
                  disabled={!editable}
                  className={inputCls}
                />
              </Field>

              <Field label="Audience" hint="Les abonnés confirmés de la langue choisie.">
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as CampaignAudience)}
                  disabled={!editable}
                  className={inputCls}
                >
                  <option value="all">Tous les abonnés ({counts.all})</option>
                  <option value="fr">Français ({counts.fr})</option>
                  <option value="en">English ({counts.en})</option>
                  <option value="ar">العربية ({counts.ar})</option>
                </select>
              </Field>

              {editable && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-glass-border-strong)] bg-[var(--admin-soft-2)] px-4 py-2 font-body text-sm font-semibold text-[var(--admin-text-primary)] transition-colors hover:border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] disabled:opacity-60"
                  >
                    <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      if (!confirm('Supprimer cette campagne ?')) return
                      startDeleting(async () => {
                        const r = await deleteCampaign(campaign.id)
                        if (r.ok) {
                          toast.success('Campagne supprimée')
                          router.push('/admin/campaigns')
                        } else {
                          toast.error(humanCampaignError(r.error))
                        }
                      })
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--c-rose)_40%,transparent)] bg-transparent px-3 py-2 font-body text-[13px] font-medium text-[var(--c-rose)] hover:bg-[color-mix(in_oklab,var(--c-rose)_8%,transparent)] disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Contenu
            </p>
            <BlockComposer blocks={blocks} onChange={setBlocks} disabled={!editable} />
          </GlassCard>

          <GlassCard className="p-6">
            <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              Envoi
            </p>
            <SendPanel
              key={`${campaign.status}:${initialProgress.processed}:${initialProgress.failed}`}
              campaignId={campaign.id}
              status={campaign.status}
              scheduledFor={campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null}
              sentAt={campaign.sentAt ? campaign.sentAt.toISOString() : null}
              openCount={campaign.openCount}
              clickCount={campaign.clickCount}
              audience={audience}
              counts={counts}
              initialProgress={initialProgress}
              dirty={dirty}
              onAfterChange={() => router.refresh()}
            />
          </GlassCard>
        </div>

        {/* ── right: exact preview ────────────────────────────── */}
        <GlassCard className="overflow-hidden p-0 xl:sticky xl:top-6">
          <EnvelopePreview subject={subject} preheader={preheader} blocks={blocks} />
        </GlassCard>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block font-body text-[12.5px] font-semibold text-[var(--admin-text-secondary)]">
        {label}
      </span>
      {hint && (
        <span className="mb-1.5 mt-0.5 block font-body text-[11.5px] text-[var(--admin-text-tertiary)]">
          {hint}
        </span>
      )}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
