import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { Toaster } from 'sonner'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/admin')
  }

  const userRow = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  const userRole = userRow?.role ?? 'staff'

  return (
    <div className="flex min-h-screen bg-surface-base">
      <AdminSidebar userRole={userRole} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <AdminBreadcrumb />

        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--color-surface-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-surface-overlay)',
          },
        }}
      />
    </div>
  )
}
