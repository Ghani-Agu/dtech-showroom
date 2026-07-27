'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  KeyRound,
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
  updateProfile,
} from '@/server/admin-settings-actions'
import { cn } from '@/lib/utils'

type TabId = 'profile' | 'password' | 'preferences' | 'sessions'

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
]

export interface SettingsTabsProps {
  initialName: string
  email: string
}

export function SettingsTabs({ initialName, email }: SettingsTabsProps) {
  const [active, setActive] = useState<TabId>('profile')

  return (
    <div className="space-y-6">
      <nav
        aria-label="Sections des réglages"
        role="tablist"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((tab) => {
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
          actuellement connecté. La session en cours est conservée.
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
