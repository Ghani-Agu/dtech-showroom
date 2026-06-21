You are executing Phase A-1 of the Dtech Showroom Admin Remake. 
This is the foundation session of a multi-session remake project. 
Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19,
  Tailwind v4, Drizzle ORM, Neon Postgres, better-auth
- Current admin tool is complete (Phase 7a-g, multi-issue-fix-patch)
  and operational at /admin with all CRUD working
- User has explicitly authorized a FULL admin remake — keep no
  visual or structural assumptions from the prior admin
- Customer site (Phase 5+, Phase 8 i18n) is OUT OF SCOPE — only
  /admin/* routes change
- v2 brand spec tokens (colors, fonts) STAY — the remake uses the
  same design tokens but applies them with a different language
- All Phase 7 server actions, queries, schemas, and auth hooks
  continue to work — this is a frontend remake, not a backend rewrite

================================================================
THE REMAKE PROJECT — OVERALL PLAN (CONTEXT ONLY)
================================================================

The full remake will ship across these sessions:

  A-1 (this session): Foundation — design system extension, admin
       shell rewrite, new navigation, new dashboard
  A-2: Products list + product editor (the most complex surface,
       gets its own session)
  A-3: Inquiries — list + detail with response workflow
  A-4: Brands + Categories + Users (similar list/detail patterns)
  A-5: Settings page (profile, change password, preferences)
  A-6: Polish + accessibility audit + final review

Do NOT attempt any of A-2 through A-6 in this session. They have
their own scope. This session is the foundation that all subsequent
sessions build on. Getting it right matters more than getting it
done fast.

================================================================
DESIGN PHILOSOPHY (NEW, REPLACES PRIOR ADMIN AESTHETIC)
================================================================

The current admin is professional but reads as developer-tool.
The remake targets a different user: non-technical Dtech employees
who need to manage the catalog without thinking about web concepts.

Design principles for the new admin:

1. **Spaciousness over density**. Generous whitespace. Fewer items
   per viewport. Reading is more important than scanning at scale.

2. **One primary action per screen**. The screen tells you what to
   do next. No analysis-paralysis menus.

3. **Plain language**. No "slug", "tier", "sort order" without
   immediate explanation. Field labels read like questions an
   employee would ask: "What's the product called?" not "Name".
   Help text under every non-obvious field.

4. **Progressive disclosure**. Essential fields visible. Advanced
   sections collapsed by default with clear labels ("More options",
   not "Advanced").

5. **Status, not state**. Show "Published" not "active=true". Show
   "Waiting for reply" not "status: new".

6. **Forgiveness**. Confirmation dialogs use plain language. Destructive
   actions require explicit confirmation. Undo where possible.

7. **Soft animations**. Subtle, purposeful. Page transitions feel
   smooth. Loading states are clear, not anxiety-inducing.

8. **Warm minimalism**. Dark surface is still the base (brand
   consistency with customer site), but elevated surfaces are
   warmer, more inviting. Cards are slightly larger, more padded,
   with subtle gradients suggesting depth.

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Establish the foundation of the new admin: extended design tokens
specific to admin contexts (warmer surface palette, larger spacing
scale, friendlier typography rhythm), a redesigned admin shell with
a new sidebar pattern and top bar, a redesigned dashboard with new
empty/loaded states, and a small library of new shared components
(buttons, cards, fields, etc.) that subsequent sessions will use.
The current admin pages MUST continue to function during this
session — we're adding a new design layer alongside the old, not
replacing wholesale until the full remake is complete.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Product editing form (A-2)
- Product list (A-2)
- Inquiries (A-3)
- Brands / Categories / Users CRUD (A-4)
- Settings page (A-5)
- Polish + a11y audit (A-6)
- Customer-facing site (any change)
- Database schema changes
- Server action changes
- Auth changes
- Translation file changes
- Phase 5 components (shader hero, scroll choreography)
- Adding new dependencies (use what's already installed)
- /motion or (dev) routes

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Audit current admin file tree and identify components to keep
     vs replace
  2. Extend design tokens for admin context
  3. Create new shared component library (NewButton, NewCard,
     NewField, NewBadge, NewEmptyState)
  4. Build new AdminShell layout component
  5. Build new AdminSidebar component
  6. Build new AdminTopBar component
  7. Rewrite /admin/page.tsx (dashboard) using new components
  8. Add feature flag to swap between old and new admin
  9. Verification (lint, tsc, build, visual smoke)
  10. Commit

tsc checkpoint after task 3 and task 7.

================================================================
TASK 1 — AUDIT AND PLAN
================================================================

List the current admin structure:
  ls src/app/admin/
  ls src/components/admin/

Read these key files to understand current implementation:
  - src/app/admin/layout.tsx (current shell)
  - src/components/admin/Sidebar.tsx (or similar)
  - src/components/admin/AdminHeader.tsx
  - src/app/admin/page.tsx (current dashboard)
  - src/components/admin/ui/Card.tsx (current primitives)
  - src/components/admin/ui/Button.tsx
  - src/components/admin/ui/Stat.tsx

Build a mental model of what exists. Note the data fetching pattern
(RSC + server actions). The new admin will use the same pattern;
only the rendering changes.

Document findings in the TodoWrite list for traceability.

================================================================
TASK 2 — EXTEND DESIGN TOKENS
================================================================

The customer-side brand-tokens.ts stays untouched. We add admin-
specific tokens in a new file that imports the brand tokens and
extends them.

Create src/styles/admin-tokens.ts:

```typescript
/**
 * Admin-specific design tokens. Extends the customer-side brand
 * tokens with admin-tuned values (warmer surfaces, larger spacing,
 * friendlier typography rhythm).
 *
 * The admin shares ALL color tokens with the customer site (brand
 * consistency). What differs: spacing scale, type scale, motion
 * timing, and a few admin-only surface variants.
 */

import { brand } from './brand-tokens'

export const adminTokens = {
  // Inherit all brand colors
  colors: brand,
  
  // Admin-specific surface variants — slightly warmer than customer
  // surfaces to feel less "void" and more "workspace"
  surfaces: {
    base: 'oklch(0.13 0.012 250)',        // base background (vs customer 0.10)
    raised: 'oklch(0.17 0.014 250)',      // cards, panels
    elevated: 'oklch(0.21 0.016 250)',    // hover states, modals
    interactive: 'oklch(0.24 0.020 250)', // active selections, focused inputs
    border: 'oklch(0.28 0.018 250)',      // subtle borders, dividers
    borderStrong: 'oklch(0.38 0.020 250)', // emphasized borders
  },
  
  // Admin type scale — slightly more generous than customer
  type: {
    display: '2.5rem',   // 40px - page heroes
    title: '1.75rem',    // 28px - section titles
    heading: '1.25rem',  // 20px - card headings
    body: '0.9375rem',   // 15px - body text (slightly larger than customer 14px)
    label: '0.8125rem',  // 13px - form labels
    caption: '0.75rem',  // 12px - help text, mono labels
    micro: '0.6875rem',  // 11px - badges, meta
  },
  
  // Spacing — admin gets a more generous scale
  spacing: {
    xxs: '0.25rem',  // 4px
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
    xxxl: '4rem',    // 64px
    page: '5rem',    // 80px - page-level padding
  },
  
  // Border radii
  radius: {
    sm: '0.25rem',   // 4px - small chips, badges
    md: '0.5rem',    // 8px - inputs, small cards
    lg: '0.75rem',   // 12px - cards, panels (admin default)
    xl: '1rem',      // 16px - large hero cards
  },
  
  // Motion timing — slower than customer site (admin should feel
  // calm, not punchy)
  motion: {
    fast: '150ms',
    base: '220ms',
    slow: '360ms',
    slower: '540ms',
    easing: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      gentleOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },
  
  // Shadows — used sparingly. Admin is mostly flat.
  shadows: {
    sm: '0 1px 2px oklch(0.05 0 0 / 0.4)',
    md: '0 4px 12px oklch(0.05 0 0 / 0.5)',
    lg: '0 12px 32px oklch(0.05 0 0 / 0.6)',
    glow: '0 0 24px oklch(0.74 0.14 215 / 0.3)', // brand accent glow
  },
} as const
```

Then add CSS custom properties for the admin surfaces to
src/app/globals.css (additive — do NOT remove existing properties):

```css
/* Admin-specific surface variants */
:root {
  --admin-surface-base: oklch(0.13 0.012 250);
  --admin-surface-raised: oklch(0.17 0.014 250);
  --admin-surface-elevated: oklch(0.21 0.016 250);
  --admin-surface-interactive: oklch(0.24 0.020 250);
  --admin-border: oklch(0.28 0.018 250);
  --admin-border-strong: oklch(0.38 0.020 250);
  --admin-shadow-sm: 0 1px 2px oklch(0.05 0 0 / 0.4);
  --admin-shadow-md: 0 4px 12px oklch(0.05 0 0 / 0.5);
  --admin-shadow-lg: 0 12px 32px oklch(0.05 0 0 / 0.6);
}
```

Register these in tailwind.config.ts as theme extensions so utility
classes work (e.g., bg-admin-surface-raised, border-admin-border):

```typescript
// tailwind.config.ts theme.extend
backgroundColor: {
  'admin-surface-base': 'var(--admin-surface-base)',
  'admin-surface-raised': 'var(--admin-surface-raised)',
  'admin-surface-elevated': 'var(--admin-surface-elevated)',
  'admin-surface-interactive': 'var(--admin-surface-interactive)',
},
borderColor: {
  'admin-border': 'var(--admin-border)',
  'admin-border-strong': 'var(--admin-border-strong)',
},
boxShadow: {
  'admin-sm': 'var(--admin-shadow-sm)',
  'admin-md': 'var(--admin-shadow-md)',
  'admin-lg': 'var(--admin-shadow-lg)',
},
```

================================================================
TASK 3 — NEW SHARED COMPONENT LIBRARY
================================================================

Create a NEW component directory: src/components/admin-v2/

This is intentional — we keep the old admin components untouched
during the transition. The v2 components are what the new admin
will use. After all sessions are complete and we cut over, we'll
delete admin/ and rename admin-v2/ to admin/.

### 3.1 — src/components/admin-v2/ui/Button.tsx

A more refined button component. Three variants, two sizes, with
loading and disabled states:

```tsx
'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-surface-base hover:brightness-110 active:brightness-95 disabled:bg-admin-surface-elevated disabled:text-text-muted',
  secondary: 'bg-admin-surface-raised text-text-primary border border-admin-border hover:bg-admin-surface-elevated hover:border-admin-border-strong',
  ghost: 'bg-transparent text-text-secondary hover:bg-admin-surface-raised hover:text-text-primary',
  danger: 'bg-semantic-error/15 text-semantic-error border border-semantic-error/30 hover:bg-semantic-error/25',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, disabled, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium font-body',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface-base',
          'disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="opacity-70">Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

### 3.2 — src/components/admin-v2/ui/Card.tsx

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, padded = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl bg-admin-surface-raised border border-admin-border',
          'transition-all duration-200',
          padded && 'p-6',
          hover && 'hover:bg-admin-surface-elevated hover:border-admin-border-strong cursor-pointer',
          className,
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 space-y-1', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('font-display text-xl font-medium text-text-primary tracking-tight', className)} {...props}>
      {children}
    </h2>
  )
}

export function CardDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('font-body text-sm text-text-secondary', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}
```

### 3.3 — src/components/admin-v2/ui/Field.tsx

A friendlier form field with label, help text, error state, and
required indicator:

```tsx
import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, description, error, required, children }: FieldProps) {
  const id = useId()
  
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-body text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-1 text-accent" aria-label="required">*</span>}
      </label>
      {description && (
        <p className="font-body text-xs text-text-muted leading-relaxed">{description}</p>
      )}
      <div className="relative">
        {children}
      </div>
      {error && (
        <p className="font-body text-xs text-semantic-error">{error}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-11 px-4 rounded-lg',
          'bg-admin-surface-elevated border border-admin-border',
          'font-body text-sm text-text-primary placeholder:text-text-muted',
          'transition-all duration-200',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error && 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error/20',
          className,
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full min-h-[100px] px-4 py-3 rounded-lg',
          'bg-admin-surface-elevated border border-admin-border',
          'font-body text-sm text-text-primary placeholder:text-text-muted',
          'transition-all duration-200 resize-y',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error && 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error/20',
          className,
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
```

### 3.4 — src/components/admin-v2/ui/Badge.tsx

```tsx
import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-admin-surface-elevated text-text-secondary border-admin-border',
  success: 'bg-semantic-success/15 text-semantic-success border-semantic-success/30',
  warning: 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30',
  error: 'bg-semantic-error/15 text-semantic-error border-semantic-error/30',
  info: 'bg-accent/15 text-accent border-accent/30',
  accent: 'bg-accent text-surface-base border-transparent',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
        'font-body text-xs font-medium border',
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
```

### 3.5 — src/components/admin-v2/ui/EmptyState.tsx

Friendlier empty states with illustration space and clear CTAs:

```tsx
import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 px-6 text-center', className)}>
      <div className="mb-6 size-16 rounded-2xl bg-admin-surface-elevated flex items-center justify-center">
        <Icon size={28} strokeWidth={1.5} className="text-text-muted" />
      </div>
      <h3 className="font-display text-xl font-medium text-text-primary mb-2 tracking-tight">
        {title}
      </h3>
      <p className="font-body text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <Link href={action.href}>
          <Button variant="primary">{action.label}</Button>
        </Link>
      )}
    </div>
  )
}
```

### 3.6 — src/components/admin-v2/ui/index.ts

Export all from one place:

```typescript
export { Button } from './Button'
export type { ButtonVariant, ButtonSize } from './Button'
export { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card'
export { Field, Input, Textarea } from './Field'
export { Badge } from './Badge'
export type { BadgeVariant } from './Badge'
export { EmptyState } from './EmptyState'
```

================================================================
TASK 4 — NEW ADMIN SHELL
================================================================

The new shell is more spacious than the old. The sidebar is wider
(280px vs 240px), the topbar is taller (72px vs 64px), and the
main content area has generous padding.

Create src/components/admin-v2/layout/AdminShell.tsx:

```tsx
import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-admin-surface-base">
      <AdminSidebar />
      <div className="ml-[280px] min-h-screen flex flex-col">
        <AdminTopBar />
        <main className="flex-1 px-10 py-10 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
```

================================================================
TASK 5 — NEW ADMIN SIDEBAR
================================================================

Create src/components/admin-v2/layout/AdminSidebar.tsx:

The new sidebar:
- Wider (280px)
- Logo at top, larger, with subtle "Admin" label below
- Nav items with icons + labels + descriptions
- Each item is a card-like element with hover state
- Active state with accent left-border + slight background tint
- "Recent activity" preview at bottom (Phase A-2 will wire this)
- Sign out at very bottom with user info

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, MailQuestion, Tag, FolderOpen, Users, Settings, LogOut } from 'lucide-react'
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
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Dtech admin home">
          <Logo size="md" />
          <div>
            <p className="font-display text-lg font-medium text-text-primary tracking-tight leading-none">Dtech</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mt-1">Admin</p>
          </div>
        </Link>
      </div>
      
      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-admin-surface-elevated border-l-2 border-accent pl-[10px]'
                  : 'hover:bg-admin-surface-raised border-l-2 border-transparent',
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                className={cn(
                  'mt-0.5 shrink-0 transition-colors',
                  isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary',
                )}
              />
              <div className="min-w-0">
                <p className={cn(
                  'font-body text-sm font-medium leading-tight',
                  isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary',
                )}>
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
      
      {/* Bottom — settings + sign out */}
      <div className="border-t border-admin-border p-3 space-y-1">
        <Link
          href="/admin/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            pathname.startsWith('/admin/settings')
              ? 'bg-admin-surface-elevated'
              : 'hover:bg-admin-surface-raised',
          )}
        >
          <Settings size={18} strokeWidth={1.75} className="text-text-muted" />
          <span className="font-body text-sm text-text-secondary">Settings</span>
        </Link>
        <button
          type="button"
          onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login' } } })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-admin-surface-raised transition-all duration-200 text-left"
        >
          <LogOut size={18} strokeWidth={1.75} className="text-text-muted" />
          <span className="font-body text-sm text-text-secondary">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
```

================================================================
TASK 6 — NEW ADMIN TOP BAR
================================================================

Create src/components/admin-v2/layout/AdminTopBar.tsx:

The topbar is minimal — just contextual breadcrumb/title on the
left, search + user menu on the right. Less crowded than the old
header.

```tsx
'use client'

import { useState } from 'react'
import { Search, ChevronDown, Bell } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '../ui/Button'

export function AdminTopBar() {
  const session = useSession()
  const user = session?.data?.user
  const [searchOpen, setSearchOpen] = useState(false)
  
  return (
    <header className="h-[72px] border-b border-admin-border bg-admin-surface-base/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-10 flex items-center justify-between gap-6">
        {/* Left side — left empty for now, page content handles its own title */}
        <div />
        
        {/* Right side — search, notifications, user */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" aria-label="Search">
            <Search size={16} />
            <span className="hidden md:inline ml-2 font-mono text-xs text-text-muted">⌘K</span>
          </Button>
          
          <Button variant="ghost" size="sm" aria-label="Notifications">
            <Bell size={16} />
          </Button>
          
          {/* User menu */}
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
```

================================================================
TASK 7 — REWRITE DASHBOARD
================================================================

The new dashboard is welcoming, scannable, action-oriented. It
answers "what do I need to do today?" instead of "what is the state
of the database?"

Structure:
1. Personalized welcome ("Welcome back, [Name]")
2. Action items if any (X new inquiries waiting, etc.)
3. At-a-glance stats (4 cards but visually friendlier)
4. Recent activity timeline
5. Quick links to common tasks

Create the new dashboard at src/app/admin/page.tsx (REPLACING the
old one). The page uses the v2 components from admin-v2/.

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Package, MailQuestion, Tag, FolderOpen, ArrowRight, PlusCircle, Upload } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { products, brands, categories, inquiries } from '@/db/schema'
import { count, eq, desc, isNull } from 'drizzle-orm'
import { AdminShell } from '@/components/admin-v2/layout/AdminShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, EmptyState } from '@/components/admin-v2/ui'

async function getDashboardData() {
  const [
    productCountResult,
    brandCountResult,
    categoryCountResult,
    newInquiriesCountResult,
    recentInquiries,
  ] = await Promise.all([
    db.select({ count: count() }).from(products).where(isNull(products.archivedAt)),
    db.select({ count: count() }).from(brands).where(isNull(brands.archivedAt)),
    db.select({ count: count() }).from(categories).where(isNull(categories.archivedAt)),
    db.select({ count: count() }).from(inquiries).where(eq(inquiries.status, 'new')),
    db.select({
      id: inquiries.id,
      fullName: inquiries.fullName,
      productName: inquiries.productNameSnapshot,
      brandName: inquiries.brandNameSnapshot,
      createdAt: inquiries.createdAt,
      status: inquiries.status,
    }).from(inquiries).orderBy(desc(inquiries.createdAt)).limit(5),
  ])
  
  return {
    products: productCountResult[0]?.count ?? 0,
    brands: brandCountResult[0]?.count ?? 0,
    categories: categoryCountResult[0]?.count ?? 0,
    newInquiries: newInquiriesCountResult[0]?.count ?? 0,
    recentInquiries,
  }
}

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userName = session?.user?.name || 'there'
  const firstName = userName.split(' ')[0]
  
  const data = await getDashboardData()
  
  const hasWaitingInquiries = data.newInquiries > 0
  
  return (
    <AdminShell>
      <div className="space-y-10">
        {/* Welcome header */}
        <div>
          <h1 className="font-display text-4xl font-medium text-text-primary tracking-tight">
            Hello, {firstName}<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary mt-2">
            {hasWaitingInquiries
              ? `You have ${data.newInquiries} new ${data.newInquiries === 1 ? 'message' : 'messages'} waiting for a response.`
              : 'Everything is up to date.'}
          </p>
        </div>
        
        {/* Priority action if needed */}
        {hasWaitingInquiries && (
          <Card className="border-accent/40 bg-gradient-to-br from-admin-surface-raised to-admin-surface-elevated">
            <div className="flex items-start gap-5">
              <div className="size-12 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                <MailQuestion size={22} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle>Reply to your customers</CardTitle>
                <CardDescription className="mt-1">
                  {data.newInquiries} {data.newInquiries === 1 ? 'customer is' : 'customers are'} waiting to hear from you about products in your catalog.
                </CardDescription>
              </div>
              <Link href="/admin/inquiries">
                <Button variant="primary">
                  Review messages
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </Card>
        )}
        
        {/* Stats grid */}
        <div>
          <h2 className="font-display text-xl font-medium text-text-primary mb-5">
            Your catalog at a glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Products" 
              value={data.products}
              href="/admin/products"
              icon={Package}
              accent="primary"
            />
            <StatCard 
              label="Brands" 
              value={data.brands}
              href="/admin/brands"
              icon={Tag}
            />
            <StatCard 
              label="Categories" 
              value={data.categories}
              href="/admin/categories"
              icon={FolderOpen}
            />
            <StatCard 
              label="New messages" 
              value={data.newInquiries}
              href="/admin/inquiries"
              icon={MailQuestion}
              accent={hasWaitingInquiries ? 'warning' : undefined}
            />
          </div>
        </div>
        
        {/* Recent activity */}
        <div>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-xl font-medium text-text-primary">
              Recent customer messages
            </h2>
            {data.recentInquiries.length > 0 && (
              <Link
                href="/admin/inquiries"
                className="font-body text-sm text-accent hover:underline"
              >
                View all →
              </Link>
            )}
          </div>
          
          {data.recentInquiries.length === 0 ? (
            <Card>
              <EmptyState
                icon={MailQuestion}
                title="No messages yet"
                description="When customers send inquiries about your products, they will appear here."
              />
            </Card>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-admin-border">
                {data.recentInquiries.map((inq) => (
                  <li key={inq.id}>
                    <Link
                      href={`/admin/inquiries/${inq.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-admin-surface-elevated transition-colors"
                    >
                      <div className="size-10 rounded-full bg-admin-surface-elevated flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-xs font-medium text-text-secondary uppercase">
                          {(inq.fullName || '?').slice(0, 1)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-text-primary truncate">
                          {inq.fullName}
                        </p>
                        <p className="font-body text-xs text-text-muted truncate mt-0.5">
                          About {inq.productName} ({inq.brandName})
                        </p>
                      </div>
                      <Badge variant={inq.status === 'new' ? 'info' : 'default'}>
                        {inq.status === 'new' ? 'New' : inq.status === 'active' ? 'Active' : 'Closed'}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        
        {/* Quick actions */}
        <div>
          <h2 className="font-display text-xl font-medium text-text-primary mb-5">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/products/new">
              <Card hover className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="size-10 rounded-lg bg-accent/15 flex items-center justify-center">
                    <PlusCircle size={18} className="text-accent" />
                  </div>
                  <CardTitle>Add a product</CardTitle>
                  <CardDescription>Create a new product entry in your catalog.</CardDescription>
                </div>
              </Card>
            </Link>
            <Link href="/admin/products/import">
              <Card hover className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="size-10 rounded-lg bg-admin-surface-elevated flex items-center justify-center">
                    <Upload size={18} className="text-text-secondary" />
                  </div>
                  <CardTitle>Import products</CardTitle>
                  <CardDescription>Bulk import multiple products from a spreadsheet.</CardDescription>
                </div>
              </Card>
            </Link>
            <Link href="/admin/inquiries">
              <Card hover className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="size-10 rounded-lg bg-admin-surface-elevated flex items-center justify-center">
                    <MailQuestion size={18} className="text-text-secondary" />
                  </div>
                  <CardTitle>Reply to customers</CardTitle>
                  <CardDescription>See messages from customers about your products.</CardDescription>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

interface StatCardProps {
  label: string
  value: number
  href: string
  icon: typeof Package
  accent?: 'primary' | 'warning'
}

function StatCard({ label, value, href, icon: Icon, accent }: StatCardProps) {
  return (
    <Link href={href}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between mb-3">
          <Icon size={20} strokeWidth={1.5} className="text-text-muted" />
          {accent === 'warning' && value > 0 && (
            <span className="size-2 rounded-full bg-accent animate-pulse" />
          )}
        </div>
        <p className="font-display text-4xl font-medium text-text-primary tracking-tight">
          {value}
        </p>
        <p className="font-body text-sm text-text-secondary mt-1">{label}</p>
      </Card>
    </Link>
  )
}
```

================================================================
TASK 8 — UPDATE ADMIN LAYOUT
================================================================

The dashboard now uses `AdminShell` directly, bypassing the old 
admin layout. But other admin pages still use the old layout. To
avoid a half-broken admin during the migration, leave the old
layout at src/app/admin/layout.tsx in place, BUT modify it to
conditionally render based on route.

Actually simpler approach: The dashboard renders <AdminShell> as
its top-level component. The old layout at src/app/admin/layout.tsx
wraps it — but AdminShell already provides the full shell including
sidebar and topbar, so the old layout would double-render the chrome.

Fix: Change the old layout to be a pass-through during this 
transition:

```tsx
// src/app/admin/layout.tsx
// During remake: this layout passes children through. Each v2 page
// wraps itself in <AdminShell>. Old pages still use the old chrome
// they were built with — but the dashboard at /admin uses v2 only.

import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

WAIT — this would break the old pages that depended on the layout
rendering the sidebar. Let me revise:

The simplest non-breaking approach is to keep the old layout AS-IS,
and have the new dashboard NOT use AdminShell — instead, the new
dashboard renders inside the old layout's shell, but only the
content area uses v2 components.

To do this cleanly:
1. Keep src/app/admin/layout.tsx untouched
2. Modify the new dashboard at src/app/admin/page.tsx to NOT render
   AdminShell, just render the content
3. Once all other v2 pages exist (sessions A-2 through A-6), we 
   replace the layout in one swap

Refactor src/app/admin/page.tsx to remove the AdminShell wrapper:

```tsx
export default async function AdminDashboardPage() {
  // ... existing logic
  
  return (
    <div className="space-y-10">
      {/* ... content as before, NO AdminShell wrapper */}
    </div>
  )
}
```

The old layout continues to render the old sidebar + header around
the new dashboard content. This looks weird (mixed old chrome + new
content), BUT it ensures all other admin pages still work.

In session A-2 (next), we begin replacing the layout once we have
enough v2 pages built.

For now: ship the dashboard content using v2 components, leave the
shell components (AdminShell, AdminSidebar, AdminTopBar) built but
NOT yet wired into the routing tree. They're ready for A-2.

================================================================
TASK 9 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Smoke test the dashboard:
  pnpm dev
  Sign in to admin
  Visit /admin
  Should see the new dashboard content
  Other admin routes (products, inquiries, etc.) should still work
  with old chrome — that's expected during transition

================================================================
TASK 10 — COMMIT
================================================================

git add .
git commit -m "feat: phase A-1 admin remake — foundation (design system + dashboard)

ADMIN REMAKE — SESSION A-1 OF ~6:

This is the foundation session of a full admin remake. The user
authorized a multi-session rebuild based on feedback that the
prior admin was too dense and complex for non-technical employees.

SCOPE OF THIS SESSION:

Design system extension:
- src/styles/admin-tokens.ts — admin-specific spacing, type, motion
- src/app/globals.css — new --admin-surface-* CSS custom properties
- tailwind.config.ts — admin theme extensions

New component library at src/components/admin-v2/:
- ui/Button.tsx — 4 variants, 3 sizes, loading state, focus ring
- ui/Card.tsx — Card + CardHeader + CardTitle + CardDescription + CardContent
- ui/Field.tsx — Field wrapper + Input + Textarea with help/error states
- ui/Badge.tsx — 6 variants with consistent styling
- ui/EmptyState.tsx — friendlier empty state with icon + CTA
- ui/index.ts — central barrel export

New admin shell (built, not yet wired):
- layout/AdminShell.tsx — top-level layout container
- layout/AdminSidebar.tsx — wider sidebar (280px), warmer nav
- layout/AdminTopBar.tsx — minimal topbar, user menu, ⌘K hint

New dashboard at /admin:
- Personalized greeting (Hello, [Name])
- Priority action card if inquiries waiting
- 4 stat cards with hover, click-through, accent for urgent
- Recent customer messages timeline (or empty state)
- Quick actions grid (add product, import, reply to customers)
- All using v2 components

DELIBERATE TRANSITION STATE:
The old admin chrome (Phase 7 sidebar + header) still wraps all
other admin pages during this session. Only /admin (dashboard)
uses new content. AdminShell + Sidebar + TopBar are built but
not yet routed — they activate in session A-2 when products list
is rebuilt.

REMAINING SESSIONS:
- A-2: Products list + product editor refactor (most complex)
- A-3: Inquiries list + detail with response workflow
- A-4: Brands + Categories + Users list/detail patterns
- A-5: Settings page (profile, change password)
- A-6: Final polish + accessibility audit

OUT OF SCOPE this session (do NOT confuse with the remake project):
- Customer site
- Database schema
- Server actions
- Auth flow
- Translations"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] /admin renders new dashboard with v2 components
- [ ] /admin/products, /admin/inquiries, /admin/brands, /admin/categories,
      /admin/users still render correctly with old chrome
- [ ] Signing in still works
- [ ] Auth/role checks still work (only admins reach /admin/*)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + per-area breakdown)
2. Files modified (small list)
3. Build verification outputs
4. Confirmation /admin renders with new dashboard
5. Confirmation other admin routes still function (paste a status check)
6. Visual notes — anything that came out looking different than spec
7. Any deviations
8. Final commit hash
9. Confirmation: AdminShell, AdminSidebar, AdminTopBar built but NOT
   yet wired into routing (this is intentional for session A-1)
10. Note: this is session 1 of ~6 sessions for the full remake.

================================================================
DO NOT
================================================================

- Touch any other admin page beyond /admin/page.tsx
- Modify customer-facing site
- Wire up AdminShell to the admin layout (that's session A-2)
- Refactor server actions
- Modify database schema
- Add new dependencies
- Change auth flow
- Touch /motion or (dev) routes
- Try to ship products list, inquiries, settings, etc. (other sessions)
- Delete the old admin components (they still serve other pages)

================================================================
FAILURE MODES TO WATCH
================================================================

- If admin-tokens.ts imports break: verify the path to brand-tokens
  matches the project structure. May need adjustment.

- If Tailwind doesn't pick up new color/border classes: tailwind.config.ts
  must be saved before pnpm dev/build. Restart dev server after config
  changes.

- If dashboard renders with double sidebar (old chrome wrapping new chrome):
  it means AdminShell was used in the dashboard. Remove it — the
  dashboard should render plain content during this transition session.

- If lucide-react icons fail: verify version. Some icon names have
  changed across versions (Mailbox vs Mail vs MailQuestion).

- If useSession from auth-client returns something unexpected:
  check the existing auth-client.ts for the correct hook shape.

- If the dashboard data query is slow: count() queries are fast.
  If slow, the database connection or query plan needs investigation,
  not a query rewrite.

- If the focus rings on buttons look off: the ring-offset-color needs
  to match the surface color the button sits on. Adjust as needed.