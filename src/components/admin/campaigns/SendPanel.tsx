'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CalendarClock,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Send,
  X,
} from 'lucide-react'
import type { CampaignStatus } from '@/db/schema'
import type { AudienceCounts, CampaignProgress, ChunkResult } from '@/types/campaigns'
import {
  retryFailedCampaignSends,
  runCampaignChunk,
  scheduleCampaign,
  sendTestCampaign,
  unscheduleCampaign,
} from '@/server/campaign-actions'
import type { CampaignAudience } from '@/lib/email-blocks'

export function humanCampaignError(err?: string): string {
  if (!err) return 'Échec'
  const map: Record<string, string> = {
    unauthorized: 'Session expirée. Reconnectez-vous.',
    missing_id: 'Identifiant manquant.',
    subject_required: 'Le sujet est requis.',
    body_required: 'Le contenu est requis.',
    not_found: 'Campagne introuvable.',
    not_editable: 'Cette campagne a déjà été envoyée — plus modifiable.',
    not_scheduled: 'Cette campagne n’est pas programmée.',
    already_sending: 'Cette campagne est déjà partie ou en cours d’envoi.',
    missing_subject_or_body: 'Sujet et contenu sont requis avant l’envoi.',
    cannot_delete_sent: 'Une campagne déjà envoyée ne peut pas être supprimée.',
    invalid_email: 'Adresse e-mail invalide.',
    invalid_date: 'Date invalide.',
    date_in_past: 'La date doit être dans le futur (au moins 1 minute).',
    date_too_far: 'La date est trop lointaine.',
    nothing_to_retry: 'Aucun échec à réessayer.',
  }
  if (err.startsWith('Forbidden')) return 'Accès « newsletter » requis.'
  return map[err] ?? err
}

const AUDIENCE_LABELS: Record<CampaignAudience, string> = {
  all: 'Tous les abonnés',
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface SendPanelProps {
  campaignId: string
  status: CampaignStatus
  scheduledFor: string | null
  sentAt: string | null
  openCount: number
  clickCount: number
  audience: CampaignAudience
  counts: AudienceCounts
  initialProgress: CampaignProgress
  /** Unsaved editor changes — sending/scheduling is blocked until saved. */
  dirty: boolean
  onAfterChange: () => void
}

export function SendPanel({
  campaignId,
  status,
  scheduledFor,
  sentAt,
  openCount,
  clickCount,
  audience,
  counts,
  initialProgress,
  dirty,
  onAfterChange,
}: SendPanelProps) {
  const [progress, setProgress] = useState<CampaignProgress>(initialProgress)
  const [running, setRunning] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, startSendingTest] = useTransition()
  const [scheduling, startScheduling] = useTransition()
  // Filled on mount (client clock) — avoids an SSR/client hydration mismatch.
  const [scheduleAt, setScheduleAt] = useState('')
  const [minAt, setMinAt] = useState('')
  useEffect(() => {
    setScheduleAt(toLocalInputValue(new Date(Date.now() + 24 * 3600 * 1000)))
    setMinAt(toLocalInputValue(new Date(Date.now() + 2 * 60_000)))
  }, [])
  const cancelRef = useRef(false)

  const audienceCount = counts[audience]
  const editable = status === 'draft' || status === 'scheduled' || status === 'failed'
  const overdue =
    status === 'scheduled' && scheduledFor !== null && new Date(scheduledFor).getTime() < Date.now()

  async function runLoop() {
    cancelRef.current = false
    setRunning(true)
    try {
      for (;;) {
        let res: ChunkResult
        try {
          res = await runCampaignChunk(campaignId)
        } catch (err) {
          toast.error(humanCampaignError(err instanceof Error ? err.message : String(err)))
          break
        }
        setProgress({
          audienceTotal: res.audienceTotal,
          processed: res.processed,
          sent: res.sent,
          failed: res.failed,
        })
        if (!res.ok) {
          toast.error(humanCampaignError(res.error))
          break
        }
        if (res.done) {
          if (res.status === 'sent' && res.failed === 0) {
            toast.success(`Campagne envoyée à ${res.sent} abonné·e·s`)
          } else if (res.status === 'sent') {
            toast.warning(`Terminé : ${res.sent} envoyés, ${res.failed} échecs`)
          } else {
            toast.error('Envoi terminé en échec — vérifiez la configuration email.')
          }
          onAfterChange()
          break
        }
        if (cancelRef.current) {
          toast.info('Envoi mis en pause — reprenez quand vous voulez.')
          onAfterChange()
          break
        }
      }
    } finally {
      setRunning(false)
    }
  }

  const pct =
    progress.audienceTotal > 0
      ? Math.min(100, Math.round((progress.processed / progress.audienceTotal) * 100))
      : 0

  return (
    <div className="space-y-4">
      {/* ── test send ── */}
      {editable && (
        <div className="rounded-xl border border-dashed border-[var(--admin-glass-border-strong)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Test
          </p>
          <p className="mt-1 font-body text-[13px] text-[var(--admin-text-secondary)]">
            Recevez la campagne sur une seule adresse pour vérifier le rendu réel.
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
              disabled={sendingTest || !testEmail || dirty}
              title={dirty ? 'Enregistrez d’abord vos modifications' : undefined}
              onClick={() => {
                startSendingTest(async () => {
                  const r = await sendTestCampaign(campaignId, testEmail)
                  if (r.ok) toast.success('Test envoyé')
                  else toast.error(humanCampaignError(r.error))
                })
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-glass-border-strong)] px-3 py-2 font-body text-[13px] font-medium text-[var(--admin-text-primary)] hover:border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] disabled:opacity-60"
            >
              <Send size={14} /> {sendingTest ? 'Envoi…' : 'Envoyer un test'}
            </button>
          </div>
        </div>
      )}

      {/* ── schedule ── */}
      {(status === 'draft' || status === 'failed') && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--c-blue)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-blue)_6%,transparent)] p-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--c-blue)]">
            <CalendarClock size={13} /> Programmer
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleAt}
              min={minAt || undefined}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="rounded-full border border-[var(--admin-glass-border)] bg-transparent px-4 py-2 font-body text-[13px] text-[var(--admin-text-primary)] outline-none [color-scheme:dark] focus:border-[var(--admin-glass-border-strong)]"
            />
            <button
              type="button"
              disabled={scheduling || dirty || !scheduleAt}
              title={dirty ? 'Enregistrez d’abord vos modifications' : undefined}
              onClick={() => {
                startScheduling(async () => {
                  const when = new Date(scheduleAt)
                  const r = await scheduleCampaign(campaignId, when.toISOString())
                  if (r.ok) {
                    toast.success('Campagne programmée')
                    onAfterChange()
                  } else {
                    toast.error(humanCampaignError(r.error))
                  }
                })
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--c-blue)_45%,transparent)] px-3 py-2 font-body text-[13px] font-medium text-[var(--c-blue)] hover:bg-[color-mix(in_oklab,var(--c-blue)_10%,transparent)] disabled:opacity-60"
            >
              {scheduling ? 'Programmation…' : 'Programmer l’envoi'}
            </button>
          </div>
          <p className="mt-2 font-body text-[11.5px] leading-relaxed text-[var(--admin-text-tertiary)]">
            Date et heure locales. L’envoi part automatiquement à l’heure choisie (à
            quelques minutes près) : chaque visite du site déclenche la vérification des
            campagnes dues, avec la tâche quotidienne en filet de sécurité. Site sans
            aucun trafic ? Ajoutez un cron externe gratuit sur{' '}
            <code className="font-mono">/api/cron/campaigns?key=CRON_SECRET</code>.
          </p>
        </div>
      )}

      {status === 'scheduled' && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--c-blue)_40%,transparent)] bg-[color-mix(in_oklab,var(--c-blue)_8%,transparent)] p-4">
          <p className="inline-flex items-center gap-1.5 font-body text-[13.5px] font-semibold text-[var(--c-blue)]">
            <CalendarClock size={14} />
            Programmée le{' '}
            {scheduledFor
              ? new Date(scheduledFor).toLocaleString('fr-FR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '—'}
          </p>
          {overdue && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 font-body text-[12.5px] text-[var(--c-amber)]">
              <AlertTriangle size={13} /> Échéance passée — la prochaine visite du site (ou
              la tâche planifiée) la fera partir, ou cliquez « Envoyer maintenant ».
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleAt}
              min={minAt || undefined}
              onChange={(e) => setScheduleAt(e.target.value)}
              aria-label="Nouvelle date d’envoi"
              className="rounded-full border border-[var(--admin-glass-border)] bg-transparent px-4 py-2 font-body text-[12.5px] text-[var(--admin-text-primary)] outline-none [color-scheme:dark] focus:border-[var(--admin-glass-border-strong)]"
            />
            <button
              type="button"
              disabled={scheduling || dirty || !scheduleAt}
              title={dirty ? 'Enregistrez d’abord vos modifications' : undefined}
              onClick={() => {
                startScheduling(async () => {
                  const when = new Date(scheduleAt)
                  const r = await scheduleCampaign(campaignId, when.toISOString())
                  if (r.ok) {
                    toast.success('Campagne reprogrammée')
                    onAfterChange()
                  } else {
                    toast.error(humanCampaignError(r.error))
                  }
                })
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--c-blue)_45%,transparent)] px-3 py-1.5 font-body text-[12.5px] font-medium text-[var(--c-blue)] hover:bg-[color-mix(in_oklab,var(--c-blue)_10%,transparent)] disabled:opacity-60"
            >
              Reprogrammer
            </button>
            <button
              type="button"
              onClick={() => {
                startScheduling(async () => {
                  const r = await unscheduleCampaign(campaignId)
                  if (r.ok) {
                    toast.success('Programmation annulée')
                    onAfterChange()
                  } else {
                    toast.error(humanCampaignError(r.error))
                  }
                })
              }}
              disabled={scheduling}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-glass-border-strong)] px-3 py-1.5 font-body text-[12.5px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] disabled:opacity-60"
            >
              <X size={13} /> Annuler la programmation
            </button>
          </div>
        </div>
      )}

      {/* ── interrupted send ── */}
      {status === 'sending' && !running && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--c-amber)_45%,transparent)] bg-[color-mix(in_oklab,var(--c-amber)_8%,transparent)] p-4">
          <p className="inline-flex items-center gap-1.5 font-body text-[13.5px] font-semibold text-[var(--c-amber)]">
            <AlertTriangle size={14} /> Envoi interrompu — {progress.processed}/
            {progress.audienceTotal} traités
          </p>
          <p className="mt-1 font-body text-[12.5px] text-[var(--admin-text-secondary)]">
            Reprenez : les abonnés déjà servis ne recevront JAMAIS de doublon.
          </p>
          <button
            type="button"
            onClick={() => void runLoop()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--c-amber)] px-4 py-2 font-body text-sm font-semibold text-[#241a02] shadow-sm hover:-translate-y-px"
          >
            <Play size={14} /> Reprendre l’envoi
          </button>
        </div>
      )}

      {/* ── send now ── */}
      {(status === 'draft' || status === 'scheduled') && !running && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--c-mint)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-mint)_8%,transparent)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--c-mint)]">
            Envoyer maintenant
          </p>
          <p className="mt-1 font-body text-[13px] text-[var(--admin-text-secondary)]">
            Audience « {AUDIENCE_LABELS[audience]} » : <strong>{audienceCount}</strong> adresses
            confirmées. Envoi par vagues — gardez cet onglet ouvert jusqu’à la fin.
          </p>
          {audienceCount === 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 font-body text-[12.5px] text-[var(--c-amber)]">
              <AlertTriangle size={13} /> Aucun abonné confirmé dans cette audience.
            </p>
          )}
          <button
            type="button"
            disabled={dirty || audienceCount === 0}
            title={dirty ? 'Enregistrez d’abord vos modifications' : undefined}
            onClick={() => {
              if (
                !confirm(
                  `Envoyer cette campagne à ${audienceCount} abonné·e·s (${AUDIENCE_LABELS[audience]}) ?`
                )
              )
                return
              void runLoop()
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--c-mint)] px-4 py-2 font-body text-sm font-semibold text-[var(--admin-on-accent)] shadow-sm transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            <Rocket size={15} /> Envoyer à {audienceCount} abonné·e·s
          </button>
        </div>
      )}

      {/* ── live progress ── */}
      {running && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--c-mint)_40%,transparent)] bg-[color-mix(in_oklab,var(--c-mint)_6%,transparent)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-body text-[13.5px] font-semibold text-[var(--admin-text-primary)]">
              Envoi en cours… {progress.processed}/{progress.audienceTotal}
            </p>
            <span className="font-mono text-[11px] text-[var(--admin-text-tertiary)]">{pct}%</span>
          </div>
          <div
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--admin-soft-2)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="h-full rounded-full bg-[var(--c-mint)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-[var(--admin-text-tertiary)]">
              {progress.sent} envoyés{progress.failed > 0 ? ` · ${progress.failed} échecs` : ''}
            </p>
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-glass-border-strong)] px-3 py-1.5 font-body text-[12px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
            >
              <Pause size={12} /> Pause
            </button>
          </div>
        </div>
      )}

      {/* ── after-send recap ── */}
      {(status === 'sent' || status === 'failed') && !running && (
        <div className="rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] p-4 font-body text-[13px] text-[var(--admin-text-secondary)]">
          <p>
            <strong className="text-[var(--admin-text-primary)]">{progress.sent}</strong> envoyés ·{' '}
            <strong className="text-[var(--admin-text-primary)]">{openCount}</strong> ouverts ·{' '}
            <strong className="text-[var(--admin-text-primary)]">{clickCount}</strong> clics
            {progress.failed > 0 && (
              <>
                {' · '}
                <strong className="text-[var(--c-rose)]">{progress.failed} échecs</strong>
              </>
            )}
          </p>
          {sentAt && (
            <p className="mt-1 font-mono text-[11px] text-[var(--admin-text-tertiary)]">
              Envoyée le {new Date(sentAt).toLocaleString('fr-FR')}
            </p>
          )}
          {progress.failed > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Réessayer l’envoi vers les ${progress.failed} adresses en échec ?`))
                  return
                void (async () => {
                  const r = await retryFailedCampaignSends(campaignId)
                  if (!r.ok) {
                    toast.error(humanCampaignError(r.error))
                    return
                  }
                  await runLoop()
                })()
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--c-rose)_45%,transparent)] px-3 py-1.5 font-body text-[12.5px] font-medium text-[var(--c-rose)] hover:bg-[color-mix(in_oklab,var(--c-rose)_8%,transparent)]"
            >
              <RefreshCw size={13} /> Réessayer les {progress.failed} échecs
            </button>
          )}
        </div>
      )}
    </div>
  )
}
