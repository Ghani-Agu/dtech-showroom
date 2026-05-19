'use client'

import { Search, Bell, ChevronDown } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Avatar } from '../ui/Avatar'

export function AdminTopBar() {
  const session = useSession()
  const user = session?.data?.user
  const displayName =
    user?.name || user?.email?.split('@')[0] || 'User'

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-admin-border bg-admin-surface-raised/95 backdrop-blur-sm">
      <div className="h-full px-8 lg:px-12 flex items-center gap-4">
        {/* Global search */}
        <div className="relative flex-1 max-w-xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search products, brands, or messages..."
            className="w-full h-11 pl-11 pr-16 rounded-xl bg-admin-surface-elevated border border-admin-border font-body text-sm text-admin-text-primary placeholder:text-admin-text-muted focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-admin-surface-raised border border-admin-border font-mono text-[10px] text-admin-text-muted">
            ⌘K
          </kbd>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            aria-label="Notifications"
            className="relative size-10 rounded-lg bg-admin-surface-elevated hover:bg-admin-surface-interactive transition-colors flex items-center justify-center text-admin-text-secondary hover:text-admin-text-primary"
          >
            <Bell size={18} />
          </button>

          {/* User chip */}
          {user && (
            <button
              type="button"
              className="flex items-center gap-3 pl-2 pr-3 h-10 rounded-lg hover:bg-admin-surface-elevated transition-colors"
            >
              <Avatar name={displayName} size="sm" />
              <span className="font-body text-sm text-admin-text-primary hidden md:inline max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className="text-admin-text-muted" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
