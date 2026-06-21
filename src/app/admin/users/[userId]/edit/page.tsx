import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { UserEditForm } from '@/components/admin/users/UserEditForm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import type { UserUpdateValues } from '@/lib/validations/user'
import { requireAdmin } from '@/lib/auth-helpers'

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params
  const user = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!user) return { title: 'Utilisateur introuvable' }

  return {
    title: `Modifier ${user.name} · Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

export default async function EditUserPage({ params }: PageProps) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/admin')
  }

  const { userId } = await params

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!user) notFound()

  const isSelf = admin.id === user.id
  const isDeactivated = user.deactivatedAt !== null

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Tous les utilisateurs
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Utilisateurs / Modifier
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            {user.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>
              {{ admin: 'admin', staff: 'équipe' }[user.role]}
            </Badge>
            {isDeactivated && <Badge variant="error">Désactivé</Badge>}
            {isSelf && <Badge variant="neutral">Vous</Badge>}
          </div>
        </div>
      </div>

      <UserEditForm
        userId={user.id}
        isSelf={isSelf}
        isDeactivated={isDeactivated}
        email={user.email}
        initialValues={{
          name: user.name,
          role: user.role,
          permissions: (user.permissions ?? []) as UserUpdateValues['permissions'],
        }}
      />
    </div>
  )
}
