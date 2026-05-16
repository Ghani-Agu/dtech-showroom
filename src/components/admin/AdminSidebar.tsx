'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  LayoutDashboard,
  MailQuestion,
  Package,
  Tag,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inquiries', label: 'Inquiries', icon: MailQuestion },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
]

interface AdminSidebarProps {
  userRole: 'admin' | 'staff'
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'admin'
  )

  return (
    <aside className="flex w-60 flex-col border-r border-surface-overlay bg-surface-base">
      <div className="border-b border-surface-overlay px-6 py-5">
        <Link
          href="/admin"
          className="font-mono text-sm uppercase tracking-wider text-text-primary transition-colors hover:text-accent"
        >
          DTECH · ADMIN
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm transition-colors',
                    isActive
                      ? 'bg-surface-elevated text-text-primary'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} className={isActive ? 'text-accent' : ''} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-surface-overlay px-6 py-4">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          View site →
        </Link>
      </div>
    </aside>
  )
}
