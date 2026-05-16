You are executing Phase 7a — Admin Shell for the Dtech Showroom 
project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 6 complete (latest commit: 111cd38): auth via better-auth, 
  /login flow works (pending env vars), middleware protects /admin/*
- Phase 5 complete: customer-facing site is feature-complete
- Real client engagement with Dtech Algérie — production-quality bar
- v2 brand spec is the source of truth for all visual decisions
- This is Phase 7a of 7 (7a, 7b, 7c, 7d, 7e, 7f, 7g)
- Architecture LOCKED: bilingual EN+FR (Phase 8 will add FR), 
  Cloudflare R2 for images (Phase 7d), email+password auth done
- Current /admin/layout.tsx wraps with AdminHeader; we replace it 
  with a proper admin shell now

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Build the foundational admin shell that will host all admin features 
in Phases 7b-7g. Replace the minimal /admin/layout.tsx from Phase 6 
with a production-quality admin interface: persistent sidebar nav, 
top header with user info + sign-out, breadcrumb context, dashboard 
landing page with key metrics, and a toast notification system 
shared across all admin pages. Build admin UI primitives (Card, 
Button, Input variants) that match the v2 brand spec but optimized 
for dense, long-session operator work. Update existing /admin and 
/admin/inquiries placeholder pages to live within the new shell. No 
new functionality (CRUD comes in 7b-7e) — this is pure 
infrastructure to host upcoming features.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Inquiry management UI (Phase 7b)
- Product CRUD (Phase 7c)
- Image upload (Phase 7d)
- Brand/category management (Phase 7e)
- User management (Phase 7e)
- CSV import (Phase 7f)
- Keyboard shortcuts / cmd+k search (Phase 7g)
- Optimistic updates beyond basic UX patterns (Phase 7g)
- French translations (Phase 8)
- Modifying customer-facing site components
- Modifying v2 brand spec, brand-tokens.ts, fonts.ts
- Touching /motion or any (dev) routes
- Modifying auth flow (login/forgot/reset stay as-is)
- Adding new database tables (data model stable for now)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install dependencies (sonner for toasts, lucide-react if not present)
  2. Build admin UI primitives (Card, Button variants, Input, Badge)
  3. Build AdminSidebar component (nav with active states)
  4. Build AdminHeader (upgrade from Phase 6 minimal version)
  5. Build AdminBreadcrumb component (auto-generates from pathname)
  6. Build Dashboard page (/admin landing)
  7. Update /admin/layout.tsx to compose the full shell
  8. Update /admin/inquiries placeholder to live within new shell
  9. Toast system integration (sonner Toaster in admin layout)
  10. Verification (lint, tsc, build, smoke tests)
  11. Commit

tsc checkpoint after task 4 and task 8.

================================================================
TASK 1 — DEPENDENCIES
================================================================

Check current installations:
  pnpm list sonner lucide-react

Install what's missing:
  pnpm add sonner

lucide-react should already be installed from earlier phases. If not:
  pnpm add lucide-react

sonner is the toast library — modern, accessible, small (~5KB), 
brand-customizable. Industry standard for Next.js admin tools.

================================================================
TASK 2 — ADMIN UI PRIMITIVES
================================================================

Create src/components/admin/ui/ directory. Each component is its own 
file. These are the building blocks for Phases 7b-7g.

Step 2.1: Card

Create src/components/admin/ui/Card.tsx:

```tsx
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outline'
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md transition-colors',
        variant === 'default' && 'bg-surface-elevated',
        variant === 'subtle' && 'bg-surface-base',
        variant === 'outline' && 'border border-surface-overlay bg-transparent',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-surface-overlay', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-lg text-text-primary', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('font-body text-sm text-text-secondary mt-1', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-surface-overlay flex items-center justify-end gap-3', className)}
      {...props}
    />
  )
}
```

Step 2.2: Button

Create src/components/admin/ui/Button.tsx:

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-body font-medium rounded-md transition-colors outline-none focus:ring-1 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base disabled:opacity-50 disabled:cursor-not-allowed',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm gap-1.5',
          size === 'md' && 'px-4 py-2 text-base gap-2',
          size === 'lg' && 'px-6 py-3 text-base gap-2',
          // Variants
          variant === 'primary' && 'bg-accent text-surface-base hover:opacity-90',
          variant === 'secondary' && 'bg-surface-elevated text-text-primary hover:bg-surface-overlay',
          variant === 'tertiary' && 'bg-transparent text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent px-2',
          variant === 'destructive' && 'bg-semantic-error/10 text-semantic-error hover:bg-semantic-error/20',
          variant === 'ghost' && 'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          className
        )}
        {...props}
      >
        {loading ? <span className="font-mono text-sm">...</span> : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

Step 2.3: Input

Create src/components/admin/ui/Input.tsx:

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  description?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, description, id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-body text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary placeholder:text-text-muted rounded-md outline-none transition focus:ring-1 focus:ring-accent',
            error && 'ring-1 ring-semantic-error focus:ring-semantic-error',
            className
          )}
          {...props}
        />
        {description && !error && (
          <p className="font-body text-sm text-text-muted">{description}</p>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-semantic-error">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
```

Step 2.4: Textarea

Create src/components/admin/ui/Textarea.tsx (same pattern as Input):

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  description?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, description, id, rows = 4, ...props }, ref) => {
    const textareaId = id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-body text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary placeholder:text-text-muted rounded-md outline-none transition focus:ring-1 focus:ring-accent resize-y',
            error && 'ring-1 ring-semantic-error focus:ring-semantic-error',
            className
          )}
          {...props}
        />
        {description && !error && (
          <p className="font-body text-sm text-text-muted">{description}</p>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-semantic-error">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
```

Step 2.5: Badge

Create src/components/admin/ui/Badge.tsx:

```tsx
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'error'
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-xs uppercase tracking-wider',
        variant === 'neutral' && 'bg-surface-elevated text-text-secondary',
        variant === 'accent' && 'bg-accent/10 text-accent',
        variant === 'success' && 'bg-semantic-success/10 text-semantic-success',
        variant === 'warning' && 'bg-semantic-warning/10 text-semantic-warning',
        variant === 'error' && 'bg-semantic-error/10 text-semantic-error',
        className
      )}
      {...props}
    />
  )
}
```

Step 2.6: Stat (dashboard metric tile)

Create src/components/admin/ui/Stat.tsx:

```tsx
import { Card } from './Card'

interface StatProps {
  label: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: React.ReactNode
}

export function Stat({ label, value, hint, icon }: StatProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-3">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {label}
        </p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <p className="font-display text-3xl text-text-primary tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="font-body text-sm text-text-secondary mt-2">{hint}</p>
      )}
    </Card>
  )
}
```

================================================================
TASK 3 — ADMIN SIDEBAR
================================================================

Create src/components/admin/AdminSidebar.tsx:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  MailQuestion, 
  Package, 
  Tag, 
  FolderOpen, 
  Users 
} from 'lucide-react'

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
    <aside className="w-60 bg-surface-base border-r border-surface-overlay flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-surface-overlay">
        <Link 
          href="/admin" 
          className="font-mono text-sm uppercase tracking-wider text-text-primary hover:text-accent transition-colors"
        >
          DTECH · ADMIN
        </Link>
      </div>
      
      {/* Nav */}
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
                    'flex items-center gap-3 px-3 py-2 rounded-md font-body text-sm transition-colors',
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
      
      {/* Footer hint */}
      <div className="px-6 py-4 border-t border-surface-overlay">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
        >
          View site →
        </Link>
      </div>
    </aside>
  )
}
```

================================================================
TASK 4 — UPGRADED ADMIN HEADER
================================================================

Replace the existing src/components/admin/AdminHeader.tsx (from Phase 6) 
with a richer version:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useSession, authClient } from '@/lib/auth-client'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function AdminHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])
  
  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }
  
  return (
    <header className="flex items-center justify-end px-6 py-3 bg-surface-base border-b border-surface-overlay">
      {!isPending && session?.user && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-surface-elevated"
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
              className="absolute right-0 mt-2 w-48 bg-surface-elevated border border-surface-overlay rounded-md shadow-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-surface-overlay">
                <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                  Signed in as
                </p>
                <p className="font-body text-sm text-text-primary mt-1">
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
                className="w-full px-4 py-2.5 text-left flex items-center gap-2 font-body text-sm text-text-primary hover:bg-surface-overlay transition-colors"
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
```

================================================================
TASK 5 — ADMIN BREADCRUMB
================================================================

Create src/components/admin/AdminBreadcrumb.tsx:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const labelMap: Record<string, string> = {
  admin: 'Admin',
  inquiries: 'Inquiries',
  products: 'Products',
  brands: 'Brands',
  categories: 'Categories',
  users: 'Users',
  new: 'New',
  edit: 'Edit',
}

function formatSegment(segment: string): string {
  return labelMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  
  // Build cumulative paths for each segment
  const crumbs = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }))
  
  if (crumbs.length <= 1) return null  // Don't show on /admin itself
  
  return (
    <nav 
      aria-label="Breadcrumb"
      className="px-8 py-3 border-b border-surface-overlay"
    >
      <ol className="flex items-center gap-2 text-sm font-body">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight size={14} className="text-text-muted" />
            )}
            {crumb.isLast ? (
              <span className="text-text-primary font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

================================================================
TASK 6 — DASHBOARD PAGE
================================================================

Replace the existing src/app/admin/page.tsx with a real dashboard:

```tsx
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'
import { Stat } from '@/components/admin/ui/Stat'
import { db } from '@/db/client'
import { products, brands, categories, inquiries } from '@/db/schema'
import { count, eq, desc } from 'drizzle-orm'
import { 
  Package, 
  Tag, 
  FolderOpen, 
  MailQuestion, 
  CircleCheckBig,
  CircleDashed,
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard — Dtech Admin',
  robots: { index: false, follow: false },
}

async function getDashboardData() {
  const [
    productCount,
    brandCount,
    categoryCount,
    inquiryNewCount,
    inquiryTotalCount,
    recentInquiries,
  ] = await Promise.all([
    db.select({ count: count() }).from(products).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(brands).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(categories).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(inquiries).where(eq(inquiries.status, 'new')).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(inquiries).then(r => r[0]?.count ?? 0),
    db.select().from(inquiries).orderBy(desc(inquiries.submittedAt)).limit(5),
  ])
  
  return {
    productCount,
    brandCount,
    categoryCount,
    inquiryNewCount,
    inquiryTotalCount,
    recentInquiries,
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Dashboard
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          Overview<span className="text-accent">.</span>
        </h1>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Products"
          value={data.productCount}
          icon={<Package size={16} />}
        />
        <Stat
          label="Brands"
          value={data.brandCount}
          icon={<Tag size={16} />}
        />
        <Stat
          label="Categories"
          value={data.categoryCount}
          icon={<FolderOpen size={16} />}
        />
        <Stat
          label="New inquiries"
          value={data.inquiryNewCount}
          hint={`${data.inquiryTotalCount} total`}
          icon={<MailQuestion size={16} />}
        />
      </div>
      
      {/* Recent inquiries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent inquiries</CardTitle>
              <CardDescription>
                Latest 5 inquiries submitted by customers.
              </CardDescription>
            </div>
            <Link
              href="/admin/inquiries"
              className="font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {data.recentInquiries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CircleDashed size={32} className="mx-auto text-text-muted mb-3" />
              <p className="font-body text-base text-text-secondary">
                No inquiries yet.
              </p>
              <p className="font-body text-sm text-text-muted mt-1">
                Customer inquiries from the contact form will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-overlay">
              {data.recentInquiries.map((inquiry) => (
                <li key={inquiry.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-overlay/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-body text-base text-text-primary truncate">
                        {inquiry.fullName}
                      </p>
                      {inquiry.status === 'new' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono text-xs uppercase tracking-wider">
                          <CircleCheckBig size={10} />
                          New
                        </span>
                      )}
                    </div>
                    <p className="font-body text-sm text-text-secondary mt-1 truncate">
                      About {inquiry.productName}
                    </p>
                  </div>
                  <time className="font-mono text-xs text-text-muted whitespace-nowrap ml-4">
                    {new Date(inquiry.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      {/* Quick actions */}
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common admin tasks. Full CRUD interfaces in the relevant sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/admin/products"
              className="block px-4 py-3 bg-surface-base hover:bg-surface-overlay rounded-md transition-colors"
            >
              <p className="font-body text-sm font-medium text-text-primary">Manage products</p>
              <p className="font-body text-xs text-text-muted mt-1">
                Create, edit, and organize the catalog
              </p>
            </Link>
            <Link
              href="/admin/inquiries"
              className="block px-4 py-3 bg-surface-base hover:bg-surface-overlay rounded-md transition-colors"
            >
              <p className="font-body text-sm font-medium text-text-primary">Review inquiries</p>
              <p className="font-body text-xs text-text-muted mt-1">
                Respond to customer questions
              </p>
            </Link>
            <Link
              href="/admin/brands"
              className="block px-4 py-3 bg-surface-base hover:bg-surface-overlay rounded-md transition-colors"
            >
              <p className="font-body text-sm font-medium text-text-primary">Manage brands</p>
              <p className="font-body text-xs text-text-muted mt-1">
                Update brand info and imagery
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

================================================================
TASK 7 — ADMIN LAYOUT COMPOSITION
================================================================

Replace the existing src/app/admin/layout.tsx with the full shell:

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Toaster } from 'sonner'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: even though middleware protects /admin/*, double-check here
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
  if (!session) {
    redirect('/login?redirect=/admin')
  }
  
  // Fetch user role from DB (not stored in session by default)
  const userRow = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)
  
  const userRole = userRow?.role ?? 'staff'
  
  return (
    <div className="min-h-screen bg-surface-base flex">
      {/* Sidebar */}
      <AdminSidebar userRole={userRole} />
      
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <AdminBreadcrumb />
        
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Toast container */}
      <Toaster 
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--color-surface-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-surface-overlay)',
          },
        }}
      />
    </div>
  )
}
```

Notes:
- Defense-in-depth auth check at layout level (middleware already 
  does this, but layout-level check protects against middleware 
  bypass scenarios)
- User role fetched at layout level, passed to sidebar for 
  conditional nav rendering
- Toaster from sonner is placed at root so toasts work across all 
  admin pages
- Sonner theme set to dark to match brand
- min-w-0 on main column prevents flex children from causing horizontal scroll
- overflow-y-auto on main allows scroll within main while sidebar stays fixed

================================================================
TASK 8 — INQUIRIES PLACEHOLDER (KEEP MINIMAL FOR NOW)
================================================================

Update src/app/admin/inquiries/page.tsx to a minimal placeholder that 
fits within the new shell. Full CRUD comes in Phase 7b.

```tsx
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'

export const metadata: Metadata = {
  title: 'Inquiries — Dtech Admin',
  robots: { index: false, follow: false },
}

export default function InquiriesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Inquiries
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          Customer inquiries<span className="text-accent">.</span>
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 7b</CardTitle>
          <CardDescription>
            Full inquiry management — list, detail, status updates, notes, search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-text-secondary">
            The inquiry management interface is part of Phase 7b. For now, inquiries 
            are stored in the database and visible via{' '}
            <code className="font-mono text-sm bg-surface-elevated px-1.5 py-0.5 rounded">
              pnpm db:studio
            </code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

Create placeholder pages for the routes that exist in the sidebar 
but don't have content yet:

src/app/admin/products/page.tsx (similar Coming-in-7c placeholder)
src/app/admin/brands/page.tsx (similar Coming-in-7e placeholder)
src/app/admin/categories/page.tsx (similar Coming-in-7e placeholder)
src/app/admin/users/page.tsx (similar Coming-in-7e placeholder)

Each follows the same pattern: a heading matching the nav label, then 
a Card explaining what's coming in which phase. This prevents 404s 
when an operator clicks a sidebar link.

================================================================
TASK 9 — TOAST UTILITY HELPER
================================================================

Create src/lib/toast.ts for consistent toast usage across admin pages:

```typescript
import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast(message),
  loading: (message: string) => sonnerToast.loading(message),
  promise: sonnerToast.promise,
}
```

Future admin code imports from `@/lib/toast` rather than `sonner` 
directly — gives us a single point of customization later if needed.

================================================================
TASK 10 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test admin routes (these all redirect to /login since no session yet 
without the user having seeded an admin and signed in — that's 
expected and correct):

  $adminRoutes = @(
    '/admin',
    '/admin/inquiries',
    '/admin/products',
    '/admin/brands',
    '/admin/categories',
    '/admin/users'
  )
  foreach ($r in $adminRoutes) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
      Write-Host "Status: $($res.StatusCode) $r"
    } catch [System.Net.WebException] {
      Write-Host "Redirect 307 $r (middleware working)"
    }
  }

Expected: all admin routes return 307 redirect to /login (since 
middleware kicks in before the route handler).

Regression smoke tests on existing routes:

  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/login', '/forgot-password')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All should return 200.

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 11 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7a — admin shell

NEW DEPENDENCIES:
- sonner — accessible, brand-customizable toast notification library

ADMIN UI PRIMITIVES (src/components/admin/ui/):
- Card with CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Button with primary/secondary/tertiary/destructive/ghost variants
- Input with label/error/description states
- Textarea with same API as Input
- Badge with neutral/accent/success/warning/error variants
- Stat tile for dashboard metrics

ADMIN SHELL COMPONENTS:
- AdminSidebar — persistent left nav, role-based visibility (Users 
  link admin-only), active state highlighting via aria-current
- AdminHeader — user menu with dropdown, sign-out, outside-click close
- AdminBreadcrumb — auto-generates from pathname, doesn't render on root

DASHBOARD (/admin):
- 4-stat grid (products / brands / categories / new inquiries)
- Recent inquiries list (last 5 with status badges)
- Quick actions card with links to manage sections

PLACEHOLDER PAGES (until later sub-phases land):
- /admin/inquiries — Phase 7b
- /admin/products — Phase 7c
- /admin/brands — Phase 7e
- /admin/categories — Phase 7e
- /admin/users — Phase 7e

INFRASTRUCTURE:
- src/lib/toast.ts — sonner wrapper for consistent toast API
- Toaster mounted in admin/layout.tsx, dark theme matching v2 spec
- Defense-in-depth auth check in admin layout (middleware + layout)
- User role fetched once per layout render, passed to sidebar

OUT OF SCOPE (Phase 7b-g):
- Inquiry management UI
- Product CRUD with bilingual fields
- Image upload via Cloudflare R2
- Brand/category/user management
- CSV import
- Keyboard shortcuts, search palette, optimistic updates"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] All admin/* routes redirect to /login when unauthenticated
- [ ] Existing routes still return 200
- [ ] Admin UI primitives exist at src/components/admin/ui/
- [ ] AdminSidebar, AdminHeader, AdminBreadcrumb exist
- [ ] Dashboard renders without errors (when sigined in)
- [ ] Placeholder pages exist for products/brands/categories/users
- [ ] Toast system wired (Toaster in layout)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + per-component summary)
2. Files modified (count + summary)
3. Build verification outputs
4. Admin route smoke tests (all 307 redirects)
5. Regression smoke tests on existing routes
6. Any warnings or deviations from spec
7. Final commit hash
8. Note any UI decisions made when spec was underspecified

================================================================
DO NOT
================================================================

- Build real CRUD interfaces (those are Phase 7b-e)
- Add features beyond shell + dashboard + placeholders
- Modify customer-facing site components
- Modify the v2 brand spec, brand-tokens.ts, fonts.ts, animations.ts
- Modify auth flow (login, forgot, reset stay as-is)
- Touch /motion or any (dev) routes
- Add real image upload (Phase 7d with Cloudflare R2)
- Add keyboard shortcuts or cmd+k palette (Phase 7g)
- Add language switcher (Phase 8)
- Install new dependencies beyond sonner

================================================================
FAILURE MODES TO WATCH
================================================================

- If sonner's Toaster causes hydration mismatch: it must be inside 
  the layout that's a Server Component, but Toaster itself is a 
  Client Component. This usually works automatically. If not, wrap 
  Toaster in a 'use client' ClientToaster.tsx component.

- If db.select with count returns wrong shape: drizzle's count() 
  helper returns { count: number } per row. The .then(r => r[0]?.count ?? 0) 
  extracts it. Verify the column name is 'count' (lowercase) in the 
  result object.

- If lucide-react icons don't render: confirm the package is 
  installed. They should be — likely from earlier phases.

- If the dashboard's getDashboardData parallel queries fail: this 
  uses Promise.all. If one query errors, the page 500s. Wrap each 
  in .catch(() => fallback) if you want defensive failure (though 
  it's probably better to fail loudly so we know).

- If "Cannot read properties of undefined (reading 'role')" in the 
  layout: this means the user exists in better-auth's users table 
  but role wasn't set (defaults to 'staff' in schema). The fallback 
  `userRow?.role ?? 'staff'` handles this.

- If users.role enum query fails: confirm the userRoleEnum was 
  created in Phase 6's migration. Run pnpm db:studio and check the 
  users table — there should be a 'role' column of type user_role.

- If middleware doesn't catch /admin/users specifically: confirm 
  middleware matcher is ['/admin/:path*'] and not just ['/admin'].

- If active-state highlighting on sidebar shows wrong item: the 
  /admin route is the dashboard; its active check uses === '/admin' 
  (exact match), while sub-routes use startsWith. Without this 
  distinction, the Dashboard item would highlight on every /admin/* 
  page.

- If Toaster's theme="dark" looks wrong: sonner may not pick up CSS 
  variables. Pass explicit hex values if needed, OR set CSS variables 
  via globals.css for Sonner's specific custom properties.