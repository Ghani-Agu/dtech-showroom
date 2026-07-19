'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Monitor,
  Palette,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { GlassCard } from '@/components/admin/GlassCard'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'
import { authClient } from '@/lib/auth-client'
import {
  changePasswordAction,
  clearBrevoKey,
  saveBrevoSettings,
  testBrevoConnection,
  updateProfile,
  type BrevoSettingsView,
} from '@/server/admin-settings-actions'
import { cn } from '@/lib/utils'

type TabId = 'profile' | 'password' | 'preferences' | 'sessions' | 'integrations'

interface Tab {
  id: TabId
  label: string
  icon: typeof UserIcon
}

const TABS: Tab[] = [
  { id: 'profile', label: 'Profil', icon: UserIcon },
  { id: 'password', label: 'Mot de passe', icon: KeyRound },
  { id: 'preferences', label: 'Préférences', icon: Palette },
  { id: 'sessions', label: 'Sessions', icon: ShieldCheck },
  { id: 'integrations', label: 'Intégrations', icon: Mail },
]

export interface SettingsTabsProps {
  initialName: string
  email: string
  /** Intégrations (Brevo) est réservé aux administrateurs. */
  isAdmin?: boolean
  brevo?: BrevoSettingsView | null
}

export function SettingsTabs({
  initialName,
  email,
  isAdmin = false,
  brevo = null,
}: SettingsTabsProps) {
  const [active, setActive] = useState<TabId>('profile')
  const visibleTabs = TABS.filter(
    (tab) => tab.id !== 'integrations' || isAdmin
  )

  return (
    <div className="space-y-6">
      <nav
        aria-label="Sections des réglages"
        role="tablist"
        className="flex flex-wrap gap-2"
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-body text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
                isActive
                  ? 'bg-[var(--admin-cyan)]/15 border border-cyan-400/30 text-[var(--admin-cyan)]'
                  : 'bg-white/[0.03] border border-white/[0.08] text-[var(--admin-text-secondary)] hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <Icon size={14} strokeWidth={1.75} />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div
        role="tabpanel"
        id={`settings-panel-${active}`}
        aria-labelledby={`settings-tab-${active}`}
      >
        {active === 'profile' && (
          <ProfilePanel initialName={initialName} email={email} />
        )}
        {active === 'password' && <PasswordPanel />}
        {active === 'preferences' && <PreferencesPanel />}
        {active === 'sessions' && <SessionsPanel />}
        {active === 'integrations' && isAdmin && (
          <IntegrationsPanel brevo={brevo} />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Profile                                                            */
/* ------------------------------------------------------------------ */

function ProfilePanel({
  initialName,
  email,
}: {
  initialName: string
  email: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const fd = new FormData()
    fd.set('name', name)
    startTransition(async () => {
      const result = await updateProfile(fd)
      if (result.ok) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <h2 className="font-display text-xl text-white">Profil</h2>
        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Votre nom est affiché dans le tableau de bord. L'adresse e-mail
          n'est pas modifiable ici car elle nécessite une re-vérification.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Initials name={name || email} />

          <Input
            label="Nom affiché"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
            disabled={isPending}
          />

          <Input
            label="E-mail"
            value={email}
            readOnly
            disabled
            description="L'e-mail est en lecture seule."
          />

          {error && (
            <p
              role="alert"
              className="font-body text-sm text-rose-300"
              aria-live="polite"
            >
              {error}
            </p>
          )}
          {success && !error && (
            <p
              className="font-body text-sm text-emerald-300"
              aria-live="polite"
            >
              Profil mis à jour.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  )
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full font-mono text-base font-medium text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--admin-cyan), var(--admin-purple))',
        }}
      >
        {initials || '?'}
      </span>
      <span className="font-mono text-xs uppercase tracking-[2px] text-[var(--admin-text-tertiary)]">
        Les initiales sont générées automatiquement.
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Password                                                           */
/* ------------------------------------------------------------------ */

function PasswordPanel() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (next.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (next !== confirm) {
      setError('Les nouveaux mots de passe ne correspondent pas')
      return
    }

    const fd = new FormData()
    fd.set('currentPassword', current)
    fd.set('newPassword', next)

    startTransition(async () => {
      const result = await changePasswordAction(fd)
      if (result.ok) {
        setSuccess(true)
        reset()
      } else {
        setError(result.error ?? 'Échec du changement de mot de passe')
      }
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <h2 className="font-display text-xl text-white">Changer le mot de passe</h2>
        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Choisissez un mot de passe que vous n'utilisez nulle part ailleurs. 8 caractères minimum.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Input
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            disabled={isPending}
          />
          <Input
            label="Nouveau mot de passe"
            description="8 caractères minimum."
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
            disabled={isPending}
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            disabled={isPending}
          />

          {error && (
            <p
              role="alert"
              className="font-body text-sm text-rose-300"
              aria-live="polite"
            >
              {error}
            </p>
          )}
          {success && !error && (
            <p
              className="font-body text-sm text-emerald-300"
              aria-live="polite"
            >
              Mot de passe changé.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isPending}>
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/* Preferences — admin is dark-only per locked decisions, so this     */
/* surface is display-only for now.                                   */
/* ------------------------------------------------------------------ */

function PreferencesPanel() {
  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <h2 className="font-display text-xl text-white">Préférences</h2>
        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Apparence et langue de l'admin. Le thème est fixé en mode sombre.
        </p>

        <dl className="mt-6 space-y-4">
          <PrefRow
            icon={Monitor}
            label="Apparence"
            value="Sombre (verre)"
            hint="L'admin est volontairement en mode sombre uniquement."
          />
          <PrefRow
            icon={Palette}
            label="Couleur d'accent"
            value="Cyan"
            hint="Valeur par défaut du système."
          />
        </dl>
      </div>
    </GlassCard>
  )
}

function PrefRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof UserIcon
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-[var(--admin-text-secondary)]">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div>
          <dt className="font-body text-sm text-white">{label}</dt>
          {hint && (
            <dd className="mt-0.5 font-body text-xs text-[var(--admin-text-tertiary)]">
              {hint}
            </dd>
          )}
        </div>
        <dd className="font-mono text-xs uppercase tracking-[1.5px] text-[var(--admin-cyan)]">
          {value}
        </dd>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sessions                                                           */
/* ------------------------------------------------------------------ */

function SessionsPanel() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleRevokeOthers() {
    if (
      !confirm(
        'Se déconnecter de tous les autres appareils ? Vous resterez connecté ici.'
      )
    ) {
      return
    }
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await authClient.revokeOtherSessions()
        setSuccess(true)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Échec de la révocation des sessions'
        setError(msg)
      }
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <h2 className="font-display text-xl text-white">Sessions actives</h2>
        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Déconnectez-vous de tous les autres appareils où ce compte est
          actuellement connecté. La session en cours est conservée. La
          déconnexion peut prendre jusqu'à 5 minutes sur les autres
          appareils.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 font-body text-sm text-rose-300"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {success && !error && (
          <p
            className="mt-4 font-body text-sm text-emerald-300"
            aria-live="polite"
          >
            Autres sessions révoquées.
          </p>
        )}

        <div className="mt-6">
          <Button
            type="button"
            variant="destructive"
            onClick={handleRevokeOthers}
            loading={isPending}
          >
            Se déconnecter des autres appareils
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/* Intégrations — Brevo (email marketing)                              */
/* ------------------------------------------------------------------ */

function IntegrationsPanel({ brevo }: { brevo: BrevoSettingsView | null }) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [listId, setListId] = useState(brevo?.listId ?? '')
  const [fromEmail, setFromEmail] = useState(brevo?.fromEmail ?? '')
  const [fromName, setFromName] = useState(brevo?.fromName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTesting] = useTransition()

  const configured = brevo?.configured ?? false

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await saveBrevoSettings({
        apiKey,
        listId,
        fromEmail,
        fromName,
      })
      if (result.ok) {
        setApiKey('')
        setNotice('Paramètres Brevo enregistrés.')
        router.refresh()
      } else {
        setError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  function onTest() {
    setError(null)
    setNotice(null)
    startTesting(async () => {
      const result = await testBrevoConnection(apiKey || undefined)
      if (result.ok) {
        setNotice(result.message)
      } else {
        setError(result.message)
      }
    })
  }

  function onClear() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await clearBrevoKey()
      if (result.ok) {
        setNotice('Clé Brevo supprimée.')
        router.refresh()
      } else {
        setError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  return (
    <GlassCard className="max-w-2xl">
      <div className="px-2 py-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-white">
            Brevo — e-mail marketing
          </h2>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[1.5px]',
              configured
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-white/[0.1] bg-white/[0.03] text-[var(--admin-text-tertiary)]'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                configured ? 'bg-emerald-300' : 'bg-white/30'
              )}
            />
            {configured ? 'Connecté' : 'Non configuré'}
          </span>
        </div>
        <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
          Collez votre clé API Brevo pour envoyer les campagnes, les
          confirmations d'inscription à la newsletter et les e-mails de
          réinitialisation via Brevo. Les abonnés confirmés sont aussi
          synchronisés vers vos contacts Brevo. La clé se crée dans
          Brevo&nbsp;: Profil → SMTP &amp; API → Clés API.
        </p>
        {configured && brevo?.keyMasked && (
          <p className="mt-2 font-mono text-xs text-[var(--admin-text-tertiary)]">
            Clé actuelle : {brevo.keyMasked}
          </p>
        )}

        <form onSubmit={onSave} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="brevo-api-key"
              className="font-body text-sm font-medium text-white"
            >
              Clé API {configured ? '(laisser vide pour conserver)' : ''}
            </label>
            <div className="relative mt-2">
              <input
                id="brevo-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="xkeysib-…"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-11 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-400/40 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--admin-text-tertiary)] hover:text-white"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Expéditeur — nom"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Dtech Algérie"
              disabled={isPending}
              description="Nom affiché dans la boîte de réception."
            />
            <Input
              label="Expéditeur — e-mail"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="contact@dtech.dz"
              disabled={isPending}
              description="Doit être un expéditeur validé dans Brevo."
            />
          </div>

          <Input
            label="Liste Brevo (ID) — optionnel"
            value={listId}
            onChange={(e) => setListId(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="ex. 3"
            inputMode="numeric"
            disabled={isPending}
            description="Les abonnés confirmés seront ajoutés à cette liste (Contacts → Listes dans Brevo)."
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
            {configured && (
              <Button
                type="button"
                variant="ghost"
                onClick={onClear}
                disabled={isPending || isTesting}
              >
                Supprimer la clé
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onTest}
              loading={isTesting}
              disabled={isPending || (!configured && !apiKey)}
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
