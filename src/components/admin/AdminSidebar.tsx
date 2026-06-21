'use client'

// Icon library: lucide-react (already installed in package.json).
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Paintbrush,
  Palette,
  Settings,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { PulsingDot } from './PulsingDot'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  desc: string
  icon: LucideIcon
  /** Section accent (icon chip + active state). */
  color: string
  /** Open in a new browser tab (full-screen editor). */
  newTab?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    desc: 'Vue d’ensemble',
    icon: LayoutDashboard,
    color: 'var(--c-mint)',
  },
  {
    href: '/admin/products',
    label: 'Produits',
    desc: 'Catalogue du site',
    icon: Package,
    color: 'var(--c-blue)',
  },
  {
    href: '/admin/categories',
    label: 'Catégories',
    desc: 'Familles de produits',
    icon: FolderKanban,
    color: 'var(--c-orange)',
  },
  {
    href: '/admin/brands',
    label: 'Marques',
    desc: 'Partenaires distribués',
    icon: Tag,
    color: 'var(--c-violet)',
  },
  {
    href: '/admin/inquiries',
    label: 'Demandes',
    desc: 'Messages clients',
    icon: MessageSquare,
    color: 'var(--c-amber)',
  },
  {
    href: '/admin/users',
    label: 'Utilisateurs',
    desc: 'Accès de l’équipe',
    icon: Users,
    color: 'var(--c-rose)',
  },
  {
    href: '/admin/subscribers',
    label: 'Abonnés',
    desc: 'Liste de la newsletter',
    icon: Mail,
    color: 'var(--c-mint)',
  },
  {
    href: '/admin/campaigns',
    label: 'Campagnes',
    desc: 'E-mails envoyés aux abonnés',
    icon: Megaphone,
    color: 'var(--c-amber)',
  },
  {
    href: '/editor',
    label: 'Éditeur web',
    desc: 'Composer les pages',
    icon: Paintbrush,
    color: 'var(--c-emerald)',
  },
  {
    href: '/editor/themes',
    label: 'Thèmes',
    desc: 'Habiller la boutique',
    icon: Palette,
    color: 'var(--c-mint)',
  },
  {
    href: '/editor/guide',
    label: 'Catalogue & guide',
    desc: 'Apprendre l’éditeur',
    icon: BookOpen,
    color: 'var(--c-blue)',
  },
]

const NAV_SECTION: Record<string, string> = {
  '/admin/products': 'products',
  '/admin/categories': 'categories',
  '/admin/brands': 'brands',
  '/admin/inquiries': 'inquiries',
  '/admin/users': 'users',
  '/admin/subscribers': 'newsletter',
  '/admin/campaigns': 'newsletter',
  // Editor surfaces map to the "editor" permission key (defaults to allowed
  // when no list is passed — see filter logic below).
  '/editor': 'editor',
  '/editor/themes': 'editor',
  '/editor/guide': 'editor',
}

export interface AdminSidebarProps {
  className?: string
  /** Section keys this user can manage — items outside the list are hidden. */
  allowed?: string[]
}

export function AdminSidebar({ className, allowed }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin'
    // /editor must NOT match when the user is on /editor/themes or
    // /editor/guide — those have their own sidebar entries.
    if (href === '/editor') return pathname === '/editor'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function handleSignOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push('/login'),
      },
    })
  }

  return (
    <aside
      className={cn(
        'glass-surface sticky top-0 flex h-screen w-[268px] shrink-0 flex-col overflow-y-auto',
        'rounded-none border-y-0 border-l-0',
        className
      )}
      style={{ borderRight: '1px solid var(--admin-glass-border)' }}
    >
      {/* Wordmark — same language as the public site header */}
      <div className="px-5 pb-5 pt-6">
        <Link
          href="/admin"
          aria-label="Accueil admin D-Tech"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
        >
          <span
            className="flex size-9 items-center justify-center rounded-[10px] font-display text-[15px] font-bold"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in oklab, var(--c-mint) 22%, transparent), rgba(58,112,138,0.22))',
              border: '1px solid var(--admin-cyan)',
              boxShadow:
                '0 0 0 1px color-mix(in oklab, var(--c-mint) 18%, transparent), 0 0 20px color-mix(in oklab, var(--c-mint) 25%, transparent)',
              color: 'var(--admin-cyan)',
            }}
          >
            D
          </span>
          <span>
            <span className="block font-display text-[16px] font-bold tracking-tight text-white">
              D-Tech<span style={{ color: 'var(--admin-cyan)' }}>.</span>
            </span>
            <span
              className="mt-0.5 block font-mono text-[9px] uppercase"
              style={{
                color: 'var(--admin-text-tertiary)',
                letterSpacing: '2.5px',
              }}
            >
              Espace admin
            </span>
          </span>
        </Link>
      </div>

      {/* Primary nav — split into two groups so the editor cluster
          stands on its own and "Éditeur web" reads as a section, not
          just another admin row. */}
      {(() => {
        const visible = PRIMARY_NAV.filter(
          (item) =>
            !allowed ||
            !NAV_SECTION[item.href] ||
            allowed.includes(NAV_SECTION[item.href] as string)
        )
        const adminItems = visible.filter((i) => !i.href.startsWith('/editor'))
        const editorItems = visible.filter((i) => i.href.startsWith('/editor'))
        return (
          <nav aria-label="Principal" className="flex-1 px-3">
            <p
              className="px-3 pb-2 pt-1 font-mono text-[9.5px] uppercase"
              style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2.5px' }}
            >
              Administration
            </p>
            <ul className="space-y-1.5">
              {adminItems.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </ul>
            {editorItems.length > 0 && (
              <>
                <div
                  className="mx-3 my-3 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, var(--admin-glass-border-strong) 30%, var(--admin-glass-border-strong) 70%, transparent)',
                  }}
                />
                <p
                  className="flex items-center gap-2 px-3 pb-2 font-mono text-[9.5px] uppercase"
                  style={{ color: 'var(--c-emerald-text)', letterSpacing: '2.5px' }}
                >
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full"
                    style={{
                      background: 'var(--c-emerald)',
                      boxShadow: '0 0 8px var(--c-emerald)',
                      animation: 'admin-pulse-dot 2.4s ease-in-out infinite',
                    }}
                  />
                  Éditeur
                </p>
                <ul className="space-y-1.5">
                  {editorItems.map((item) => (
                    <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
                  ))}
                </ul>
              </>
            )}
          </nav>
        )
      })()}

      {/* Site shortcut */}
      <div className="px-4 pb-3 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 transition-colors hover:border-[color-mix(in_oklab,_var(--c-mint)_45%,_transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
          style={{
            borderColor: 'var(--admin-glass-border)',
            background: 'color-mix(in oklab, var(--c-mint) 4.5%, transparent)',
          }}
        >
          <span>
            <span className="flex items-center gap-2 font-body text-[13px] font-semibold text-white">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: 'var(--c-emerald)',
                  boxShadow: '0 0 8px color-mix(in oklab, var(--c-emerald) 90%, transparent)',
                  animation: 'admin-pulse-dot 2s ease-in-out infinite',
                }}
              />
              Site en ligne
            </span>
            <span
              className="mt-0.5 block font-body text-[11.5px]"
              style={{ color: 'var(--admin-text-tertiary)' }}
            >
              Voir la boutique
            </span>
          </span>
          <ExternalLink
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--admin-cyan)' }}
          />
        </a>
      </div>

      {/* Footer nav — settings + sign out */}
      <nav aria-label="Compte" className="px-3 pb-5">
        <ul className="space-y-1">
          <SidebarLink
            item={{
              href: '/admin/settings',
              label: 'Réglages',
              desc: 'Profil et préférences',
              icon: Settings,
              color: 'var(--admin-text-secondary)',
            }}
            active={isActive('/admin/settings')}
          />
          <li>
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                'transition-[transform,background-color,color] duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]',
                'hover:translate-x-1 hover:bg-white/[0.03] hover:text-white'
              )}
              style={{
                color: 'var(--admin-text-secondary)',
                transitionTimingFunction: 'var(--admin-ease)',
              }}
            >
              <LogOut size={17} strokeWidth={1.75} />
              <span className="font-body text-sm">Se déconnecter</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  const linkClass = cn(
    'group relative flex items-center gap-3 rounded-2xl border px-3 py-2.5',
    'transition-[transform,background-color,border-color,box-shadow] duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]',
    active ? '' : 'border-transparent hover:translate-x-1 hover:bg-white/[0.03]'
  )
  const linkStyle = {
    transitionTimingFunction: 'var(--admin-ease)',
    ...(active
      ? {
          background: `color-mix(in oklab, ${item.color} 9%, transparent)`,
          borderColor: `color-mix(in oklab, ${item.color} 38%, transparent)`,
          boxShadow: `0 0 22px -8px color-mix(in oklab, ${item.color} 45%, transparent)`,
        }
      : {}),
  }
  const inner = (
    <>
      {active && (
        <span className="absolute -translate-y-1/2" style={{ left: '-7px', top: '50%' }}>
          <PulsingDot />
        </span>
      )}
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: active
            ? `color-mix(in oklab, ${item.color} 15%, transparent)`
            : 'var(--admin-soft)',
          border: active
            ? `1px solid color-mix(in oklab, ${item.color} 45%, transparent)`
            : '1px solid var(--admin-glass-border)',
          color: active ? item.color : 'var(--admin-text-secondary)',
        }}
      >
        <Icon size={16.5} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span
          className="block truncate font-body text-[13.5px] font-semibold"
          style={{ color: active ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)' }}
        >
          {item.label}
        </span>
        <span
          className="block truncate font-body text-[11px]"
          style={{ color: 'var(--admin-text-tertiary)' }}
        >
          {item.desc}
        </span>
      </span>
      {item.newTab && (
        <ExternalLink size={13} className="ml-auto shrink-0" style={{ color: 'var(--admin-text-tertiary)' }} />
      )}
    </>
  )
  return (
    <li>
      {item.newTab ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={linkStyle}
        >
          {inner}
        </a>
      ) : (
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={linkClass}
          style={linkStyle}
        >
          {inner}
        </Link>
      )}
    </li>
  )
}
