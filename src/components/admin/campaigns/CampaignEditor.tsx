'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Rocket, Save, Send, Trash2, Eye } from 'lucide-react'
import type { Campaign } from '@/db/schema'
import { GlassCard } from '@/components/admin/GlassCard'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import {
  updateCampaign,
  sendCampaign,
  sendTestCampaign,
  deleteCampaign,
  type CampaignActionResult,
} from '@/server/campaign-actions'

function SaveSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-glass-border-strong)] bg-[var(--admin-soft-2)] px-4 py-2 font-body text-sm font-semibold text-[var(--admin-text-primary)] transition-colors hover:border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] disabled:opacity-60"
    >
      <Save size={15} /> {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}

interface CampaignEditorProps {
  campaign: Campaign
  subscribedCount: number
}

export function CampaignEditor({ campaign, subscribedCount }: CampaignEditorProps) {
  const router = useRouter()
  const [state, formAction] = useActionState<CampaignActionResult | null, FormData>(
    updateCampaign,
    null
  )
  const [subject, setSubject] = useState(campaign.subject)
  const [preheader, setPreheader] = useState(campaign.preheader ?? '')
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml)
  const [testEmail, setTestEmail] = useState('')
  const [sending, startSending] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [sendingTest, startSendingTest] = useTransition()

  const sent = campaign.status === 'sent' || campaign.status === 'sending'

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
            {subscribedCount} abonné·e·s confirmé·e·s sont éligibles.
          </p>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-xl border border-[color-mix(in_oklab,var(--c-rose)_40%,transparent)] bg-[color-mix(in_oklab,var(--c-rose)_8%,transparent)] px-4 py-3 font-body text-[13px] text-[var(--c-rose)]"
        >
          {humanError(state.error)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Form ────────────────────────────────────────────── */}
        <GlassCard className="p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={campaign.id} />

            <Field label="Sujet" hint="200 caractères max — premier élément que voit le client.">
              <input
                type="text"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                disabled={sent}
                className="w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-4 py-2.5 font-body text-[14px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
              />
            </Field>

            <Field
              label="Pré-en-tête"
              hint="Courte phrase affichée après le sujet par Gmail / Outlook."
            >
              <input
                type="text"
                name="preheader"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                maxLength={200}
                disabled={sent}
                className="w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-4 py-2.5 font-body text-[14px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
              />
            </Field>

            <Field
              label="Contenu (HTML)"
              hint="Tags simples uniquement : <p>, <h2>, <ul>, <a>, <strong>, <em>. Les liens http(s) sont automatiquement instrumentés pour les clics."
            >
              <textarea
                name="bodyHtml"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                disabled={sent}
                rows={14}
                className="w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-4 py-3 font-mono text-[12.5px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
              />
            </Field>

            {/* Hidden — the server keeps a plain-text variant in sync. */}
            <input type="hidden" name="bodyText" value="" />

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <SaveSubmit />
              {!sent && (
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
                        toast.error(humanError(r.error))
                      }
                    })
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--c-rose)_40%,transparent)] bg-transparent px-3 py-2 font-body text-[13px] font-medium text-[var(--c-rose)] hover:bg-[color-mix(in_oklab,var(--c-rose)_8%,transparent)] disabled:opacity-60"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </div>
          </form>

          {/* ── Test send ────────────────────────────────────── */}
          {!sent && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--admin-glass-border-strong)] p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                Test
              </p>
              <p className="mt-1 font-body text-[13px] text-[var(--admin-text-secondary)]">
                Envoyez la campagne à une seule adresse pour vérifier le rendu.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="vous@dtech.dz"
                  className="min-w-0 flex-1 rounded-full border border-[var(--admin-glass-border)] bg-transparent px-4 py-2 font-body text-[13px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-glass-border-strong)]"
                />
                <button
                  type="button"
                  disabled={sendingTest || !testEmail}
                  onClick={() => {
                    startSendingTest(async () => {
                      const r = await sendTestCampaign(campaign.id, testEmail)
                      if (r.ok) toast.success('Test envoyé')
                      else toast.error(humanError(r.error))
                    })
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-glass-border-strong)] px-3 py-2 font-body text-[13px] font-medium text-[var(--admin-text-primary)] hover:border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] disabled:opacity-60"
                >
                  <Send size={14} /> {sendingTest ? 'Envoi…' : 'Envoyer un test'}
                </button>
              </div>
            </div>
          )}

          {/* ── Send to everyone ─────────────────────────────── */}
          {!sent && (
            <div className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--c-mint)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-mint)_8%,transparent)] p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--c-mint)]">
                Envoyer maintenant
              </p>
              <p className="mt-1 font-body text-[13px] text-[var(--admin-text-secondary)]">
                Sera envoyée aux <strong>{subscribedCount}</strong> adresses confirmées.
                Pas de retour en arrière.
              </p>
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  if (!confirm(`Envoyer "${subject}" à ${subscribedCount} abonné·e·s ?`)) return
                  startSending(async () => {
                    const r = await sendCampaign(campaign.id)
                    if (r.ok) {
                      toast.success('Campagne envoyée')
                      router.refresh()
                    } else {
                      toast.error(humanError(r.error))
                    }
                  })
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--c-mint)] px-4 py-2 font-body text-sm font-semibold text-[var(--admin-on-accent)] shadow-sm transition-transform hover:-translate-y-px disabled:opacity-60"
              >
                <Rocket size={15} /> {sending ? 'Envoi en cours…' : 'Envoyer à tous'}
              </button>
            </div>
          )}

          {sent && (
            <div className="mt-6 rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] p-4 font-body text-[13px] text-[var(--admin-text-secondary)]">
              <p>
                <strong className="text-[var(--admin-text-primary)]">{campaign.sentCount}</strong>{' '}
                envoyés ·{' '}
                <strong className="text-[var(--admin-text-primary)]">{campaign.openCount}</strong>{' '}
                ouverts ·{' '}
                <strong className="text-[var(--admin-text-primary)]">{campaign.clickCount}</strong>{' '}
                clics
              </p>
              {campaign.sentAt && (
                <p className="mt-1 font-mono text-[11px] text-[var(--admin-text-tertiary)]">
                  Envoyée le {new Date(campaign.sentAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}
        </GlassCard>

        {/* ── Preview ─────────────────────────────────────────── */}
        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-[var(--admin-glass-border)] px-5 py-3">
            <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              <Eye size={13} /> Aperçu — {subject || 'Sans titre'}
            </p>
          </div>
          <div
            className="bg-[#04060c] p-5"
            style={{ minHeight: 360 }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
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

function humanError(err?: string): string {
  if (!err) return 'Échec'
  if (err === 'unauthorized') return 'Session expirée. Reconnectez-vous.'
  if (err === 'missing_id') return 'Identifiant manquant.'
  if (err === 'subject_required') return 'Le sujet est requis.'
  if (err === 'not_found') return 'Campagne introuvable.'
  if (err === 'already_sending') return 'Cette campagne est déjà partie ou en cours d’envoi.'
  if (err === 'missing_subject_or_body') return 'Sujet et contenu sont requis avant l’envoi.'
  if (err === 'cannot_delete_sent') return 'Une campagne déjà envoyée ne peut pas être supprimée.'
  if (err === 'invalid_email') return 'Adresse e-mail invalide.'
  return err
}
