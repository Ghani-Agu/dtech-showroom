import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Éditeur web · Dtech',
  robots: { index: false, follow: false },
}

/**
 * Full-screen editor shell — a Shopify-style takeover. Deliberately does NOT
 * render the admin sidebar/topbar: the editor opens in its own browser tab and
 * fills the whole viewport. The `.admin-shell` class is reused so the editor
 * chrome inherits the same glass tokens + light/dark theme as the admin.
 */
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/editor')
  }

  return (
    <div
      className="admin-shell"
      style={{ background: 'var(--admin-canvas)', minHeight: '100vh' }}
    >
      {children}
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
