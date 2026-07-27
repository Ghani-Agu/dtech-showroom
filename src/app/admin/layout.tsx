import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AmbientBackground } from '@/components/admin/AmbientBackground'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { CommandPaletteProvider } from '@/components/admin/CommandPaletteProvider'
import { auth } from '@/lib/auth'
import { getSessionUser } from '@/lib/auth-helpers'
import { allowedSections } from '@/lib/permissions'

export const metadata: Metadata = {
  title: 'Admin · Dtech',
  robots: { index: false, follow: false },
}

/**
 * Admin shell — applies `.admin-shell` so the glass tokens / keyframes
 * defined in globals.css are scoped here only, never leaking into the
 * public catalog.
 *
 * Authentication: the existing better-auth session guard is preserved.
 * The spec's "do not add authentication" is interpreted as "do not add
 * new auth"; removing the existing guard would expose admin endpoints.
 */
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

  const sessionUser = await getSessionUser()
  const allowed = sessionUser ? allowedSections(sessionUser) : []

  return (
    <div
      className="admin-shell relative min-h-screen text-white"
      style={{ background: 'var(--admin-canvas)' }}
    >
      <AmbientBackground />
      <CommandPaletteProvider>
        <div className="relative z-10 flex min-h-screen">
          <AdminSidebar allowed={allowed} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar userName={session.user?.name ?? undefined} />
            <main className="flex-1 px-8 pb-10 pt-6">{children}</main>
          </div>
        </div>
      </CommandPaletteProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--admin-glass-bg)',
            color: 'var(--admin-text-primary)',
            border: '1px solid var(--admin-glass-border-strong)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  )
}
