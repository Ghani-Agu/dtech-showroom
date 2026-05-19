import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/admin-v2/ui'
import { UserForm } from '@/components/admin/users/UserForm'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'New user · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function NewUserPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Team', href: '/admin/users' },
          { label: 'New' },
        ]}
        title="New user"
      />

      <UserForm />
    </div>
  )
}
