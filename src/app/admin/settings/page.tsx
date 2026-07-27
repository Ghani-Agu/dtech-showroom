import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { SettingsTabs } from '@/components/admin/settings/SettingsTabs'

export const metadata: Metadata = {
  title: 'Réglages · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/admin/settings')
  }

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
        initialName={session.user.name ?? ''}
        email={session.user.email}
      />
    </div>
  )
}
