'use client'

import Link from 'next/link'
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
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  description: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    description: 'Overview of your store',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/inquiries',
    label: 'Customer messages',
    description: 'Inquiries from your customers',
    icon: MailQuestion,
  },
  {
    href: '/admin/products',
    label: 'Products',
    description: 'Manage your catalog',
    icon: Package,
  },
  {
    href: '/admin/brands',
    label: 'Brands',
    description: 'HP, Dell, ASUS, TP-Link',
    icon: Tag,
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    description: 'Laptops, networking, etc.',
    icon: FolderOpen,
  },
  {
    href: '/admin/users',
    label: 'Team',
    description: 'Admin users with access',
    icon: Users,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-admin-border bg-admin-surface-base flex flex-col">
      <div className="px-6 pt-8 pb-6">
        <Link
          href="/admin"
          className="flex items-center gap-3"
          aria-label="Dtech admin home"
        >
          <Logo size="md" />
          <div>
            <p className="font-display text-lg font-medium text-text-primary tracking-tight leading-none">
              Dtech
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">
              Admin
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-admin-surface-elevated border-l-2 border-accent pl-[10px]'
                  : 'hover:bg-admin-surface-raised border-l-2 border-transparent'
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                className={cn(
                  'mt-0.5 shrink-0 transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-text-muted group-hover:text-text-secondary'
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'font-body text-sm font-medium leading-tight',
                    isActive
                      ? 'text-text-primary'
                      : 'text-text-secondary group-hover:text-text-primary'
                  )}
                >
                  {item.label}
                </p>
                <p className="font-body text-xs text-text-muted mt-0.5 leading-tight">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-admin-border p-3 space-y-1">
        <Link
          href="/admin/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            pathname.startsWith('/admin/settings')
              ? 'bg-admin-surface-elevated'
              : 'hover:bg-admin-surface-raised'
          )}
        >
          <Settings size={18} strokeWidth={1.75} className="text-text-muted" />
          <span className="font-body text-sm text-text-secondary">Settings</span>
        </Link>
        <button
          type="button"
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = '/login'
                },
              },
            })
          }
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-admin-surface-raised transition-all duration-200 text-left"
        >
          <LogOut size={18} strokeWidth={1.75} className="text-text-muted" />
          <span className="font-body text-sm text-text-secondary">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
