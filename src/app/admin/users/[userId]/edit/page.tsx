import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { UserEditForm } from '@/components/admin/users/UserEditForm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
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

  if (!user) return { title: 'User not found' }

  return {
    title: `Edit ${user.name} — Dtech Admin`,
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
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        All users
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Users / Edit
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            {user.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>
              {user.role}
            </Badge>
            {isDeactivated && <Badge variant="error">Deactivated</Badge>}
            {isSelf && <Badge variant="neutral">You</Badge>}
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
        }}
      />
    </div>
  )
}
