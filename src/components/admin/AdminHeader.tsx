'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient, useSession } from '@/lib/auth-client'

export function AdminHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between border-b border-surface-overlay bg-surface-elevated px-6 py-4">
      <Link
        href="/admin"
        className="font-mono text-sm uppercase tracking-wider text-text-primary"
      >
        DTECH · ADMIN
      </Link>

      <div className="flex items-center gap-4">
        {!isPending && session?.user ? (
          <>
            <span className="font-body text-sm text-text-secondary">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="font-body text-sm text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent"
            >
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </header>
  )
}
