'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, ExternalLink, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/admin/GlassCard'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'
import {
  saveAnalyticsSettings,
  saveAiChatSettings,
  testAiChatConnection,
  type AnalyticsSettingsView,
  type AiChatSettingsView,
} from '@/server/admin-settings-actions'
import { cn } from '@/lib/utils'

function StatusPill({
  ok,
  okLabel,
  offLabel,
}: {
  ok: boolean
  okLabel: string
  offLabel: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[1.5px]',
        ok
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-white/[0.1] bg-white/[0.03] text-[var(--admin-text-tertiary)]'
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', ok ? 'bg-emerald-300' : 'bg-white/30')}
      />
      {ok ? okLabel : offLabel}
    </span>
  )
}

/** Reusable on/off row — matches the pill-button language used elsewhere. */
function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <span className="min-w-0">
        <span className="block font-body text-sm text-white">{label}</span>
        {hint && (
          <span className="mt-0.5 block font-body text-xs text-[var(--admin-text-tertiary)]">
            {hint}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
          checked
            ? 'border-emerald-400/40 bg-emerald-400/25'
            : 'border-white/[0.12] bg-white/[0.06]',
          disabled && 'opacity-50'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 size-4.5 rounded-full bg-white transition-all',
            checked ? 'start-[22px]' : 'start-0.5'
          )}
          style={{ width: 18, height: 18 }}
        />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Google Analytics                                                    */
/* ------------------------------------------------------------------ */

export function AnalyticsIntegrationCard({
  analytics,
}: {
  analytics: AnalyticsSettingsView | null
}) {
  const router = useRouter()
  const [id, setId] = useState(analytics?.measurementId ?? '')
  const [enabled, setEnabled] = useState(analytics?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const configured = analytics?.configured ?? false
  const live = configured && enabled

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await saveAnalyticsSettings({ measurementId: id, enabled })
      if (res.ok) {
        setNotice(
          id
            ? 'Google Analytics enregistré. Le suivi est actif immédiatement — aucun redéploiement.'
            : 'Identifiant retiré. Le suivi est désactivé.'
        )
        router.refresh()
      } else {
        setError(res.error ?? 'Erreur inconnue')
      }
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl text-white">
            <BarChart3 size={18} strokeWidth={1.9} className="text-[var(--c-blue,#5b9cff)]" />
            Google Analytics 4
          </h2>
          <StatusPill ok={live} okLabel="Actif" offLabel="Non configuré" />
        </div>

        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Collez votre identifiant de mesure GA4 pour suivre les visites, les
          produits consultés, les ajouts au panier et les commandes envoyées
          sur WhatsApp. L&apos;identifiant se trouve dans Google Analytics&nbsp;:
          Admin → Flux de données → votre site web.
        </p>

        <form onSubmit={onSave} className="mt-6 space-y-5">
          <Input
            label="Identifiant de mesure"
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
            placeholder="G-XXXXXXXXXX"
            spellCheck={false}
            dir="ltr"
            disabled={isPending}
            description={
              analytics?.fromEnv
                ? "Actuellement fourni par la variable d'environnement. Une valeur saisie ici prend le dessus."
                : 'Format : G- suivi de lettres et chiffres.'
            }
          />

          <Toggle
            checked={enabled}
            onChange={setEnabled}
            disabled={isPending}
            label="Suivi activé sur le site public"
            hint="Décochez pour arrêter la collecte sans supprimer l'identifiant. L'admin n'est jamais suivi."
          />

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-[var(--admin-text-tertiary)]">
              Événements envoyés automatiquement
            </p>
            <ul className="mt-2.5 grid gap-1.5 font-body text-xs text-[var(--admin-text-secondary)] sm:grid-cols-2">
              {[
                ['page_view', 'chaque page vue'],
                ['view_item', 'fiche produit ouverte'],
                ['view_item_list', 'catalogue affiché'],
                ['add_to_cart', 'ajout au panier'],
                ['begin_checkout', 'commande WhatsApp'],
                ['search', 'recherche sur le site'],
                ['select_filter', 'filtre catalogue utilisé'],
                ['generate_lead', 'demande d’information'],
                ['sign_up', 'inscription newsletter'],
                ['chat_open', 'chat IA ouvert'],
              ].map(([name, desc]) => (
                <li key={name} className="flex items-baseline gap-2">
                  <code className="font-mono text-[11px] text-[var(--admin-cyan)]">{name}</code>
                  <span className="text-[var(--admin-text-tertiary)]">{desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-body text-xs text-[var(--admin-text-tertiary)]">
              Aucun montant n&apos;est transmis : le catalogue ne contient pas de
              prix, et envoyer une valeur inventée corromprait vos rapports de
              revenus.
            </p>
          </div>

          {error && (
            <p role="alert" className="font-body text-sm text-rose-300" aria-live="polite">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="font-body text-sm text-emerald-300" aria-live="polite">
              {notice}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {configured && (
              <a
                href={`https://analytics.google.com/analytics/web/#/p/reports/reportinghub`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-body text-sm text-[var(--admin-cyan)] hover:underline"
              >
                Ouvrir Google Analytics
                <ExternalLink size={13} />
              </a>
            )}
            <Button type="submit" variant="primary" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/* D-Tech AI chat                                                      */
/* ------------------------------------------------------------------ */

export function AiChatIntegrationCard({
  aiChat,
}: {
  aiChat: AiChatSettingsView | null
}) {
  const router = useRouter()
  const [baseUrl, setBaseUrl] = useState(aiChat?.baseUrl ?? '')
  const [widgetKey, setWidgetKey] = useState(aiChat?.widgetKey ?? '')
  const [title, setTitle] = useState(aiChat?.title ?? '')
  const [enabled, setEnabled] = useState(aiChat?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTesting] = useTransition()

  const configured = aiChat?.configured ?? false
  const live = configured && enabled

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await saveAiChatSettings({ baseUrl, widgetKey, title, enabled })
      if (res.ok) {
        setNotice('Chat IA enregistré.')
        router.refresh()
      } else {
        setError(res.error ?? 'Erreur inconnue')
      }
    })
  }

  function onTest() {
    setError(null)
    setNotice(null)
    startTesting(async () => {
      const res = await testAiChatConnection({ baseUrl, widgetKey })
      if (res.ok) setNotice(res.message)
      else setError(res.message)
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl text-white">
            <Sparkles size={18} strokeWidth={1.9} className="text-[var(--c-violet,#a78bfa)]" />
            Chat IA D-Tech
          </h2>
          <StatusPill ok={live} okLabel="En ligne" offLabel="Non configuré" />
        </div>

        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Affiche une bulle de discussion sur le site public, branchée sur
          votre application D-Tech AI. Les visiteurs posent leurs questions sur
          les produits, la disponibilité ou la livraison, et l&apos;IA répond en
          français, arabe, darija ou anglais.
        </p>

        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
          <p className="font-body text-xs leading-relaxed text-amber-200/90">
            <strong className="font-semibold">Deux choses sont nécessaires côté IA :</strong>{' '}
            l&apos;application D-Tech AI doit être déployée à une adresse
            publique, et elle doit avoir un canal de type <em>Widget</em> dont
            vous copiez la clé publique ici. Tant que ces deux éléments
            manquent, la bulle n&apos;apparaît pas du tout sur le site — aucun
            visiteur ne verra un chat cassé.
          </p>
        </div>

        {aiChat?.problem && (
          <p className="mt-3 font-body text-sm text-amber-300" aria-live="polite">
            {aiChat.problem}
          </p>
        )}

        <form onSubmit={onSave} className="mt-6 space-y-5">
          <Input
            label="Adresse de l'application IA"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://ia.dtech.dz"
            spellCheck={false}
            dir="ltr"
            disabled={isPending}
            description="L'URL publique de votre application D-Tech AI, sans barre oblique finale."
          />

          <div>
            <label
              htmlFor="ai-widget-key"
              className="font-body text-sm font-medium text-white"
            >
              Clé publique du widget
            </label>
            <input
              id="ai-widget-key"
              value={widgetKey}
              onChange={(e) => setWidgetKey(e.target.value.trim())}
              placeholder="wgt_pk_…"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-400/40 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              disabled={isPending}
            />
            <p className="mt-1.5 font-body text-xs text-[var(--admin-text-tertiary)]">
              Elle est publique par conception (elle voyage dans le navigateur du
              visiteur) — ce n&apos;est pas un secret, mais elle identifie votre
              compte. Restreignez les origines autorisées côté application IA.
            </p>
          </div>

          <Input
            label="Titre affiché — optionnel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assistant D-Tech"
            maxLength={60}
            disabled={isPending}
            description="Par défaut : « Assistant D-Tech », traduit selon la langue du visiteur."
          />

          <Toggle
            checked={enabled}
            onChange={setEnabled}
            disabled={isPending}
            label="Bulle de chat visible sur le site"
            hint="Désactivez pour la retirer temporairement sans effacer la configuration."
          />

          {error && (
            <p role="alert" className="font-body text-sm text-rose-300" aria-live="polite">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="font-body text-sm text-emerald-300" aria-live="polite">
              {notice}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onTest}
              loading={isTesting}
              disabled={isPending || (!baseUrl && !configured)}
            >
              Tester la connexion
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  )
}
