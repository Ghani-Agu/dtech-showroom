'use client'

import { useState } from 'react'
import { Search, ChevronDown, Bell } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '../ui/Button'

export function AdminTopBar() {
  const session = useSession()
  const user = session?.data?.user
  // Reserved for command-palette wiring in a later session.
  const [, setSearchOpen] = useState(false)
  void setSearchOpen

  return (
    <header className="h-[72px] border-b border-admin-border bg-admin-surface-base/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-10 flex items-center justify-between gap-6">
        <div />

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" aria-label="Search">
            <Search size={16} />
            <span className="hidden md:inline ml-2 font-mono text-xs text-text-muted">
              ⌘K
            </span>
          </Button>

          <Button variant="ghost" size="sm" aria-label="Notifications">
            <Bell size={16} />
          </Button>

          {user && (
            <button
              type="button"
              className="flex items-center gap-2 pl-3 pr-2 h-10 rounded-lg hover:bg-admin-surface-raised transition-colors"
            >
              <div className="size-7 rounded-full bg-accent/15 flex items-center justify-center">
                <span className="font-mono text-xs font-medium text-accent uppercase">
                  {(user.name || user.email || '?').slice(0, 1)}
                </span>
              </div>
              <span className="font-body text-sm text-text-primary hidden md:inline max-w-[160px] truncate">
                {user.name || user.email}
              </span>
              <ChevronDown size={14} className="text-text-muted" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
