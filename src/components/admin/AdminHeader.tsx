'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Search } from 'lucide-react'
import { authClient, useSession } from '@/lib/auth-client'

export function AdminHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-end gap-3 border-b border-surface-overlay bg-surface-base px-6 py-3">
      <div
        className="hidden items-center gap-1.5 rounded-md bg-surface-elevated px-3 py-1.5 text-text-muted md:flex"
        aria-hidden="true"
      >
        <Search size={12} />
        <span className="font-mono text-xs">⌘K</span>
      </div>
      {!isPending && session?.user && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-surface-elevated"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="font-body text-text-primary">
              {session.user.email}
            </span>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 overflow-hidden rounded-md border border-surface-overlay bg-surface-elevated shadow-lg"
            >
              <div className="border-b border-surface-overlay px-4 py-3">
                <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                  Signed in as
                </p>
                <p className="mt-1 font-body text-sm text-text-primary">
                  {session.user.name}
                </p>
                <p className="font-body text-xs text-text-secondary">
                  {session.user.email}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-body text-sm text-text-primary transition-colors hover:bg-surface-overlay"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
