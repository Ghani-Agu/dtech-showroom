import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/admin-v2/ui'
import { SettingsTabs } from '@/components/admin-v2/settings/SettingsTabs'

export const metadata: Metadata = {
  title: 'Settings · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) redirect('/login?redirect=/admin/settings')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, password, and preferences for the admin dashboard."
      />

      <SettingsTabs
        initialName={session.user.name ?? ''}
        email={session.user.email}
      />
    </div>
  )
}
