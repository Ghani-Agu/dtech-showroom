'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  MailQuestion,
  Tag,
  FolderOpen,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: string
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inquiries', label: 'Messages', icon: MailQuestion },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/users', label: 'Team', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function handleSignOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/login'
        },
      },
    })
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-admin-border bg-admin-surface-raised flex flex-col">
      {/* Brand area */}
      <div className="px-6 pt-8 pb-8">
        <Link
          href="/admin"
          className="flex items-center gap-3"
          aria-label="Dtech admin home"
        >
          <div className="size-12 rounded-xl bg-admin-surface-elevated flex items-center justify-center overflow-hidden">
            <Image
              src="/dtech.png"
              alt=""
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-admin-text-primary tracking-tight leading-none">
              Dtech
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-admin-text-muted mt-1">
              Admin Studio
            </p>
          </div>
        </Link>
      </div>

      {/* Section label */}
      <div className="px-6 mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-admin-text-muted">
          Menu
        </p>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                isActive
                  ? 'bg-admin-accent-soft text-admin-accent'
                  : 'text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary'
              )}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.75}
                className="shrink-0"
              />
              <span className="font-body text-sm font-medium flex-1">
                {item.label}
              </span>
              {item.badge && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-admin-accent text-admin-surface-base">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — settings + sign out */}
      <div className="px-3 pb-6 pt-3 border-t border-admin-border space-y-0.5">
        <Link
          href="/admin/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
            pathname.startsWith('/admin/settings')
              ? 'bg-admin-accent-soft text-admin-accent'
              : 'text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary'
          )}
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="font-body text-sm font-medium">Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary transition-all"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span className="font-body text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
