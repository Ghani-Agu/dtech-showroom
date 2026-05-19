import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader, Pill } from '@/components/admin-v2/ui'
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
    title: `Edit ${user.name} · Dtech Admin`,
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Team', href: '/admin/users' },
          { label: 'Edit' },
        ]}
        title={user.name}
        action={
          <div className="flex items-center gap-2">
            <Pill
              variant={user.role === 'admin' ? 'accent' : 'default'}
              withDot={false}
            >
              {user.role}
            </Pill>
            {isDeactivated && <Pill variant="error">Deactivated</Pill>}
            {isSelf && <Pill variant="info">You</Pill>}
          </div>
        }
      />

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
