import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserForm } from '@/components/admin/users/UserForm'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nouvel utilisateur · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function NewUserPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/admin')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Utilisateurs / Nouveau
        </p>
        <h1 className="font-display text-3xl tracking-tight text-white">
          Nouvel utilisateur<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
      </div>

      <UserForm />
    </div>
  )
}
