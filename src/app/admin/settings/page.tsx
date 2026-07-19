import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-helpers'
import { getBrevoSettingsView } from '@/server/admin-settings-actions'
import { SettingsTabs } from '@/components/admin/settings/SettingsTabs'

export const metadata: Metadata = {
  title: 'Réglages · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    redirect('/login?redirect=/admin/settings')
  }

  const brevo = await getBrevoSettingsView()

  return (
    <div className="space-y-8">
      <header>
        <p
          className="font-mono text-[11px] uppercase"
          style={{
            color: 'var(--admin-text-tertiary)',
            letterSpacing: '2px',
          }}
        >
          Réglages
        </p>
        <h1
          className="mt-2 font-display text-3xl font-light tracking-tight text-white"
        >
          Compte et préférences.
        </h1>
        <p className="mt-2 max-w-prose font-body text-sm text-[var(--admin-text-secondary)]">
          Gérez votre profil, votre mot de passe et vos sessions actives
          pour ce tableau de bord.
        </p>
      </header>

      <SettingsTabs
        initialName={sessionUser.name ?? ''}
        email={sessionUser.email}
        isAdmin={sessionUser.role === 'admin'}
        brevo={brevo}
      />
    </div>
  )
}
