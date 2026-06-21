You are executing the full Admin Remake for the Dtech Showroom 
project. This is a MONOLITHIC patch — the user has authorized a 
full rebuild of the admin UI in a single session. Read this entire 
prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19,
  Tailwind v4 (CSS-first config), Drizzle ORM, Neon Postgres,
  better-auth, Lucide icons
- Phase A-1 foundation landed (commit 72d2dbd): v2 component library
  at src/components/admin-v2/, new dashboard at /admin
- User saw the A-1 result and was not satisfied — feedback was 
  "we're going from bad to worse"
- User provided 4 reference dashboard screenshots showing modern 
  patterns they like
- This is the SINGLE consolidated remake session — no more 
  multi-session split
- Customer site OUT OF SCOPE — only /admin/* changes
- Database schema, server actions, auth flow all UNCHANGED
- Dtech logo: public/dtech.png (1024×1024, transparent background)
  Must be used everywhere correctly. The Logo component already
  exists at src/components/brand/Logo.tsx with size variants.

================================================================
DESIGN DIRECTION (FROM USER REFERENCES)
================================================================

The user uploaded four dashboard inspirations. Common patterns to
adopt:

1. **Larger numbers, smaller labels** — stats are LARGE (5xl-7xl),
   labels are compact uppercase mono. Numbers dominate.

2. **Colored icon badges in stat cards** — not flat icons. Each
   stat card has a rounded-square (rounded-2xl) icon badge with a 
   semi-transparent colored background and the icon inside.

3. **Hero banner section at top** — a prominent welcome card that
   spans the width. Subtle gradient background. Welcoming message.
   Optional illustration or icon arrangement.

4. **Live filters, no submit buttons** — when user types in search
   or changes a filter dropdown, results update immediately via
   URL params + RSC re-render. No "Apply" buttons.

5. **Modern tables** — avatars/icons in first column, status pills,
   monospaced numbers, hover row highlight, click-through to detail.

6. **Compact icon-only OR wider expressive sidebar** — Dtech goes
   wider expressive (280px) with icon + label + subtle description,
   because admin users won't memorize icons.

7. **Sticky top bar with global search** — Cmd+K palette accessible,
   plus a permanent search input visible in the topbar.

8. **Donut/pie charts in dashboard** — show category distribution,
   inquiry status mix. Requires a tiny charting solution — use 
   inline SVG, no new dependencies.

9. **Per-page hero with title + breadcrumb + primary action button** —
   every page has a clear "you are here, here's what to do" header.

10. **Theme toggle (dark/light)** — admin gets both themes. Toggle 
    in topbar. Persist preference in localStorage.

DTECH BRAND CONSTRAINTS (UNCHANGED):
- Primary surface: dark (admin gets a dark default; light theme 
  is an option)
- Accent: oklch(0.74 0.14 215) — cyan
- Fonts: General Sans (display), Inter (body), JetBrains Mono (mono)
- Logo: /dtech.png with transparent background

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Complete the admin remake in one comprehensive session. Replace the
old admin shell, sidebar, header. Rebuild every admin page using the
modern patterns from the references (large stats, colored icon
badges, hero banner, live filters, modern tables, instant search).
Add a new Settings page with profile editing and password change.
Add a theme toggle (dark/light). Wire the Dtech logo with transparent
background correctly in every location. After this session, the admin
is fully modernized end-to-end. The old admin components are deleted.
Only v2 remains.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Customer site
- Database schema changes
- Server action signature changes (use existing actions)
- Auth flow (use existing)
- New dependencies (use what exists — sharp, lucide-react, etc.)
- Charts library (use inline SVG donut/bar)
- Translation files (admin stays English)
- /motion or (dev) routes
- Customer-side Phase 5 components (shader, scroll choreography)
- Cloudflare R2 setup
- Resend setup

================================================================
EXECUTION DISCIPLINE
================================================================

This is a big session. Use TodoWrite aggressively. Suggested top-
level tasks (Claude Code may reorganize):

  1. Audit current state — what exists in admin-v2/, what's in old admin/
  2. Theme system: add light theme tokens + ThemeToggle component
  3. Refine v2 component library — add new primitives needed
  4. New AdminShell with theme provider
  5. New AdminSidebar (wider, expressive)
  6. New AdminTopBar (search input, theme toggle, user menu)
  7. Wire AdminShell into /admin/layout.tsx (replace old chrome)
  8. Rebuild dashboard (improvement over A-1 based on references)
  9. Rebuild products list with live filters
  10. Rebuild product edit form (tabbed, progressive disclosure)
  11. Rebuild products new form (simpler than edit)
  12. Rebuild product import wizard (cleaner steps)
  13. Rebuild inquiries list with live filters
  14. Rebuild inquiry detail with response workflow
  15. Rebuild brands list + detail
  16. Rebuild categories list + detail
  17. Rebuild users list + detail
  18. NEW: Settings page (profile + password + preferences)
  19. Delete old admin/ components (now unused)
  20. Verification (lint, tsc, build, smoke)
  21. Commit

tsc checkpoint after task 7 (shell wired) and task 14 (inquiries).

================================================================
TASK GROUP 1 — THEME SYSTEM
================================================================

Add light theme support. Currently admin is dark-only via 
--admin-surface-* CSS custom properties. Extend with a class-based
theme switcher.

### Step 1.1 — Update globals.css

Add light theme variants and a theme class system:

```css
/* Admin theme — dark is default */
:root {
  --admin-surface-base: oklch(0.13 0.012 250);
  --admin-surface-raised: oklch(0.17 0.014 250);
  --admin-surface-elevated: oklch(0.21 0.016 250);
  --admin-surface-interactive: oklch(0.24 0.020 250);
  --admin-border: oklch(0.28 0.018 250);
  --admin-border-strong: oklch(0.38 0.020 250);
  
  --admin-text-primary: oklch(0.97 0.01 90);
  --admin-text-secondary: oklch(0.72 0.02 90);
  --admin-text-muted: oklch(0.55 0.02 90);
  
  --admin-accent: oklch(0.74 0.14 215);
  --admin-accent-soft: oklch(0.74 0.14 215 / 0.15);
  --admin-success: oklch(0.72 0.15 145);
  --admin-success-soft: oklch(0.72 0.15 145 / 0.15);
  --admin-warning: oklch(0.80 0.15 70);
  --admin-warning-soft: oklch(0.80 0.15 70 / 0.15);
  --admin-error: oklch(0.65 0.20 25);
  --admin-error-soft: oklch(0.65 0.20 25 / 0.15);
  --admin-info: oklch(0.70 0.12 260);
  --admin-info-soft: oklch(0.70 0.12 260 / 0.15);
  
  --admin-shadow-sm: 0 1px 2px oklch(0.05 0 0 / 0.4);
  --admin-shadow-md: 0 4px 12px oklch(0.05 0 0 / 0.5);
  --admin-shadow-lg: 0 12px 32px oklch(0.05 0 0 / 0.6);
  --admin-shadow-glow: 0 0 24px oklch(0.74 0.14 215 / 0.3);
}

[data-admin-theme='light'] {
  --admin-surface-base: oklch(0.99 0.003 90);
  --admin-surface-raised: oklch(1 0 0);
  --admin-surface-elevated: oklch(0.97 0.005 90);
  --admin-surface-interactive: oklch(0.94 0.007 90);
  --admin-border: oklch(0.90 0.008 90);
  --admin-border-strong: oklch(0.82 0.010 90);
  
  --admin-text-primary: oklch(0.18 0.02 240);
  --admin-text-secondary: oklch(0.40 0.02 240);
  --admin-text-muted: oklch(0.58 0.02 240);
  
  --admin-accent: oklch(0.62 0.16 215);
  --admin-accent-soft: oklch(0.62 0.16 215 / 0.12);
  --admin-success: oklch(0.58 0.16 145);
  --admin-success-soft: oklch(0.58 0.16 145 / 0.12);
  --admin-warning: oklch(0.70 0.15 70);
  --admin-warning-soft: oklch(0.70 0.15 70 / 0.15);
  --admin-error: oklch(0.55 0.20 25);
  --admin-error-soft: oklch(0.55 0.20 25 / 0.12);
  --admin-info: oklch(0.55 0.14 260);
  --admin-info-soft: oklch(0.55 0.14 260 / 0.12);
  
  --admin-shadow-sm: 0 1px 2px oklch(0.10 0 0 / 0.05);
  --admin-shadow-md: 0 4px 16px oklch(0.10 0 0 / 0.08);
  --admin-shadow-lg: 0 12px 40px oklch(0.10 0 0 / 0.10);
}
```

### Step 1.2 — Tailwind @theme registration

Add to the @theme block in globals.css:

```css
@theme {
  /* existing tokens preserved */
  
  --color-admin-surface-base: var(--admin-surface-base);
  --color-admin-surface-raised: var(--admin-surface-raised);
  --color-admin-surface-elevated: var(--admin-surface-elevated);
  --color-admin-surface-interactive: var(--admin-surface-interactive);
  
  --color-admin-border: var(--admin-border);
  --color-admin-border-strong: var(--admin-border-strong);
  
  --color-admin-text-primary: var(--admin-text-primary);
  --color-admin-text-secondary: var(--admin-text-secondary);
  --color-admin-text-muted: var(--admin-text-muted);
  
  --color-admin-accent: var(--admin-accent);
  --color-admin-accent-soft: var(--admin-accent-soft);
  --color-admin-success: var(--admin-success);
  --color-admin-success-soft: var(--admin-success-soft);
  --color-admin-warning: var(--admin-warning);
  --color-admin-warning-soft: var(--admin-warning-soft);
  --color-admin-error: var(--admin-error);
  --color-admin-error-soft: var(--admin-error-soft);
  --color-admin-info: var(--admin-info);
  --color-admin-info-soft: var(--admin-info-soft);
  
  --shadow-admin-sm: var(--admin-shadow-sm);
  --shadow-admin-md: var(--admin-shadow-md);
  --shadow-admin-lg: var(--admin-shadow-lg);
  --shadow-admin-glow: var(--admin-shadow-glow);
}
```

### Step 1.3 — ThemeProvider

Create src/components/admin-v2/theme/ThemeProvider.tsx:

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'dtech-admin-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored)
    }
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-admin-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, mounted])
  
  function setTheme(next: Theme) {
    setThemeState(next)
  }
  
  function toggle() {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

### Step 1.4 — ThemeToggle button

Create src/components/admin-v2/theme/ThemeToggle.tsx:

```tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="size-10 rounded-lg bg-admin-surface-elevated hover:bg-admin-surface-interactive transition-colors flex items-center justify-center text-admin-text-secondary hover:text-admin-text-primary"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
```

================================================================
TASK GROUP 2 — REFINE COMPONENT LIBRARY
================================================================

The existing admin-v2 components (Button, Card, Field, Badge, 
EmptyState) need to use the new admin-text-* tokens and become 
theme-aware. Update them.

### Step 2.1 — Update Button to use admin tokens

```tsx
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-admin-accent text-admin-surface-base hover:brightness-110 active:brightness-95 disabled:bg-admin-surface-elevated disabled:text-admin-text-muted shadow-admin-sm',
  secondary: 'bg-admin-surface-raised text-admin-text-primary border border-admin-border hover:bg-admin-surface-elevated hover:border-admin-border-strong',
  ghost: 'bg-transparent text-admin-text-secondary hover:bg-admin-surface-raised hover:text-admin-text-primary',
  danger: 'bg-admin-error-soft text-admin-error border border-admin-error/30 hover:bg-admin-error/25',
}
```

Update Card, Field, Badge, EmptyState similarly — replace any uses 
of bg-surface-*, text-text-*, border-surface-overlay with 
bg-admin-surface-*, text-admin-text-*, border-admin-border.

### Step 2.2 — Add new shared primitives

**StatCard** (replaces the inline stat card from A-1 dashboard):

src/components/admin-v2/ui/StatCard.tsx:

```tsx
import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
  icon: LucideIcon
  iconColor?: 'accent' | 'success' | 'warning' | 'error' | 'info'
  href?: string
}

const ICON_COLORS = {
  accent: 'bg-admin-accent-soft text-admin-accent',
  success: 'bg-admin-success-soft text-admin-success',
  warning: 'bg-admin-warning-soft text-admin-warning',
  error: 'bg-admin-error-soft text-admin-error',
  info: 'bg-admin-info-soft text-admin-info',
}

export function StatCard({ 
  label, 
  value, 
  hint, 
  trend, 
  icon: Icon, 
  iconColor = 'accent',
  href,
}: StatCardProps) {
  const inner = (
    <div className="group relative h-full bg-admin-surface-raised border border-admin-border rounded-2xl p-6 hover:border-admin-border-strong hover:bg-admin-surface-elevated transition-all">
      <div className="flex items-start justify-between mb-6">
        <div className={cn('size-12 rounded-2xl flex items-center justify-center', ICON_COLORS[iconColor])}>
          <Icon size={22} strokeWidth={1.75} />
        </div>
        {trend && (
          <span className={cn(
            'font-mono text-xs font-medium px-2 py-1 rounded-md',
            trend.direction === 'up' && 'bg-admin-success-soft text-admin-success',
            trend.direction === 'down' && 'bg-admin-error-soft text-admin-error',
            trend.direction === 'flat' && 'bg-admin-surface-elevated text-admin-text-muted',
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="font-display text-5xl font-medium text-admin-text-primary tracking-tight leading-none">
        {value}
      </p>
      <p className="font-body text-sm text-admin-text-secondary mt-2">{label}</p>
      {hint && <p className="font-mono text-xs text-admin-text-muted mt-1 uppercase tracking-wider">{hint}</p>}
    </div>
  )
  
  if (href) {
    return <Link href={href} className="block h-full">{inner}</Link>
  }
  return inner
}
```

**PageHeader** — every admin page uses this:

src/components/admin-v2/ui/PageHeader.tsx:

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  action?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-admin-text-muted">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-admin-text-secondary transition-colors">{crumb.label}</a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <span className="text-admin-text-muted">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-medium text-admin-text-primary tracking-tight">
          {title}<span className="text-admin-accent">.</span>
        </h1>
        {description && (
          <p className="font-body text-base text-admin-text-secondary mt-2 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  )
}
```

**SearchInput** — live search with no submit button:

src/components/admin-v2/ui/SearchInput.tsx:

```tsx
'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface SearchInputProps {
  placeholder?: string
  paramName?: string
  debounceMs?: number
}

export function SearchInput({ 
  placeholder = 'Search...', 
  paramName = 'q',
  debounceMs = 250,
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) ?? '')
  const [isPending, startTransition] = useTransition()
  
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(paramName, value)
      } else {
        params.delete(paramName)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, debounceMs)
    
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  
  return (
    <div className="relative flex-1 max-w-md">
      <Search 
        size={16} 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none" 
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 rounded-lg bg-admin-surface-raised border border-admin-border font-body text-sm text-admin-text-primary placeholder:text-admin-text-muted focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded flex items-center justify-center text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-surface-elevated transition-colors"
        >
          <X size={14} />
        </button>
      )}
      {isPending && (
        <div className="absolute right-9 top-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-admin-accent border-t-transparent animate-spin" />
      )}
    </div>
  )
}
```

**FilterSelect** — dropdown that updates URL params on change:

src/components/admin-v2/ui/FilterSelect.tsx:

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface FilterSelectProps {
  paramName: string
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue?: string
}

export function FilterSelect({ paramName, label, options, defaultValue = '' }: FilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const currentValue = searchParams.get(paramName) ?? defaultValue
  
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set(paramName, e.target.value)
    } else {
      params.delete(paramName)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }
  
  return (
    <label className="relative inline-flex items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-admin-text-muted">{label}</span>
      <select
        value={currentValue}
        onChange={handleChange}
        disabled={isPending}
        className="h-10 pl-3 pr-8 rounded-lg bg-admin-surface-raised border border-admin-border font-body text-sm text-admin-text-primary focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%221.5%22><path d=%22M2.5 4.5l3.5 3.5 3.5-3.5%22/></svg>')] bg-no-repeat bg-[right_8px_center]"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}
```

**DataTable** — modern table with hover, click-through, status pills:

src/components/admin-v2/ui/DataTable.tsx:

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowHref?: (row: T) => string
  emptyMessage?: string
  rowKey: (row: T) => string
}

export function DataTable<T>({ 
  columns, 
  rows, 
  rowHref, 
  emptyMessage = 'No results',
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="bg-admin-surface-raised border border-admin-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-admin-surface-elevated border-b border-admin-border">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key}
                  className={cn(
                    'px-6 py-4 font-mono text-xs uppercase tracking-wider text-admin-text-muted font-medium',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {rows.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-16 text-center font-body text-sm text-admin-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row)
                const cells = columns.map((col) => (
                  <td 
                    key={col.key} 
                    className={cn(
                      'px-6 py-4 font-body text-sm text-admin-text-primary',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))
                
                if (href) {
                  return (
                    <tr 
                      key={rowKey(row)}
                      className="hover:bg-admin-surface-elevated transition-colors cursor-pointer"
                    >
                      {columns.map((col, i) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-6 py-4 font-body text-sm text-admin-text-primary',
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          )}
                        >
                          <Link href={href} className="block -mx-6 -my-4 px-6 py-4 hover:no-underline">
                            {col.render(row)}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  )
                }
                
                return (
                  <tr key={rowKey(row)} className="hover:bg-admin-surface-elevated transition-colors">
                    {cells}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Tabs** — for product editor:

src/components/admin-v2/ui/Tabs.tsx:

```tsx
'use client'

import { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null)

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
}

export function Tabs({ defaultValue, children }: TabsProps) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="space-y-6">{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-b border-admin-border">
      {children}
    </div>
  )
}

interface TabProps {
  value: string
  children: React.ReactNode
}

export function Tab({ value, children }: TabProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab must be inside Tabs')
  const isActive = ctx.active === value
  
  return (
    <button
      type="button"
      onClick={() => ctx.setActive(value)}
      className={cn(
        'px-4 py-3 font-body text-sm font-medium transition-colors relative',
        isActive 
          ? 'text-admin-text-primary' 
          : 'text-admin-text-muted hover:text-admin-text-secondary',
      )}
    >
      {children}
      {isActive && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-admin-accent rounded-t" />
      )}
    </button>
  )
}

export function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabPanel must be inside Tabs')
  if (ctx.active !== value) return null
  return <div>{children}</div>
}
```

**Pill** — status badge with optional icon:

src/components/admin-v2/ui/Pill.tsx:

```tsx
import { cn } from '@/lib/utils'

export type PillVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'

interface PillProps {
  variant?: PillVariant
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const VARIANT_STYLES: Record<PillVariant, string> = {
  default: 'bg-admin-surface-elevated text-admin-text-secondary border-admin-border',
  success: 'bg-admin-success-soft text-admin-success border-admin-success/30',
  warning: 'bg-admin-warning-soft text-admin-warning border-admin-warning/30',
  error: 'bg-admin-error-soft text-admin-error border-admin-error/30',
  info: 'bg-admin-info-soft text-admin-info border-admin-info/30',
  accent: 'bg-admin-accent-soft text-admin-accent border-admin-accent/30',
}

export function Pill({ variant = 'default', icon, children, className }: PillProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-xs font-medium border',
      VARIANT_STYLES[variant],
      className,
    )}>
      {icon && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
```

**Avatar** — for users / customers:

src/components/admin-v2/ui/Avatar.tsx:

```tsx
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_STYLES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div 
      className={cn(
        'rounded-full bg-admin-accent-soft text-admin-accent flex items-center justify-center font-medium',
        SIZE_STYLES[size],
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name) || '?'}
    </div>
  )
}
```

Update the ui/index.ts barrel to export all new primitives.

================================================================
TASK GROUP 3 — NEW SHELL (ACTIVATE)
================================================================

### Step 3.1 — New AdminShell

src/components/admin-v2/layout/AdminShell.tsx:

```tsx
import { ThemeProvider } from '../theme/ThemeProvider'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-admin-surface-base text-admin-text-primary">
        <AdminSidebar />
        <div className="ml-[280px] min-h-screen flex flex-col">
          <AdminTopBar />
          <main className="flex-1 px-8 lg:px-12 py-8 lg:py-10 max-w-[1600px] w-full">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
```

### Step 3.2 — New AdminSidebar

src/components/admin-v2/layout/AdminSidebar.tsx:

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, MailQuestion, Tag, FolderOpen, Users, Settings, LogOut } from 'lucide-react'
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
        onSuccess: () => { window.location.href = '/login' },
      },
    })
  }
  
  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-admin-border bg-admin-surface-raised flex flex-col">
      {/* Brand area */}
      <div className="px-6 pt-8 pb-8">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Dtech admin home">
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
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                isActive
                  ? 'bg-admin-accent-soft text-admin-accent'
                  : 'text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary',
              )}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.75}
                className="shrink-0"
              />
              <span className="font-body text-sm font-medium flex-1">{item.label}</span>
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
              : 'text-admin-text-secondary hover:bg-admin-surface-elevated hover:text-admin-text-primary',
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
```

### Step 3.3 — New AdminTopBar

src/components/admin-v2/layout/AdminTopBar.tsx:

```tsx
'use client'

import { Search, Bell, ChevronDown } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Avatar } from '../ui/Avatar'

export function AdminTopBar() {
  const session = useSession()
  const user = session?.data?.user
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  
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
```

### Step 3.4 — Wire AdminShell into admin layout

Open src/app/admin/layout.tsx. REPLACE its contents with:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AdminShell } from '@/components/admin-v2/layout/AdminShell'
import { Toaster } from '@/components/admin-v2/ui/Toaster'

export const metadata: Metadata = {
  title: 'Admin · Dtech',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session) {
    redirect('/login?redirect=/admin')
  }
  
  return (
    <>
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </>
  )
}
```

The Toaster is the sonner toast component already wired. If it 
doesn't exist as a v2 component, just keep the existing toast 
setup — wherever the project's toast system lives.

================================================================
TASK GROUP 4 — DASHBOARD (REBUILD, BETTER THAN A-1)
================================================================

The A-1 dashboard was a start but the user wasn't happy. Rebuild
with reference patterns: bigger hero, colorful stat cards, 
charts (donut for inquiry status, simple bar for product 
distribution), better visual hierarchy.

src/app/admin/page.tsx — REWRITE:

```tsx
import { headers } from 'next/headers'
import { count, eq, desc, isNull, sql } from 'drizzle-orm'
import { Package, MailQuestion, Tag, FolderOpen, ArrowRight, Sparkles, TrendingUp, Users2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { products, brands, categories, inquiries } from '@/db/schema'
import { StatCard, Button, Pill, Avatar, EmptyState, Card } from '@/components/admin-v2/ui'
import Link from 'next/link'

async function getDashboardData() {
  const [
    productTotal,
    productFeatured,
    brandTotal,
    categoryTotal,
    inquiryByStatus,
    recentInquiries,
    productsByBrand,
  ] = await Promise.all([
    db.select({ count: count() }).from(products).where(isNull(products.archivedAt)),
    db.select({ count: count() }).from(products).where(eq(products.featured, true)),
    db.select({ count: count() }).from(brands).where(isNull(brands.archivedAt)),
    db.select({ count: count() }).from(categories).where(isNull(categories.archivedAt)),
    db.select({ 
      status: inquiries.status, 
      count: count(),
    }).from(inquiries).groupBy(inquiries.status),
    db.select({
      id: inquiries.id,
      fullName: inquiries.fullName,
      productName: inquiries.productName,
      productBrand: inquiries.productBrand,
      submittedAt: inquiries.submittedAt,
      status: inquiries.status,
    }).from(inquiries).orderBy(desc(inquiries.submittedAt)).limit(6),
    db.select({
      brandName: brands.name,
      count: sql<number>`count(${products.id})::int`,
    })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(isNull(products.archivedAt))
    .groupBy(brands.name)
    .orderBy(desc(sql`count(${products.id})`)),
  ])
  
  const statusCounts = {
    new: 0, contacted: 0, closed: 0, spam: 0,
  }
  for (const row of inquiryByStatus) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count
    }
  }
  
  return {
    products: productTotal[0]?.count ?? 0,
    featuredProducts: productFeatured[0]?.count ?? 0,
    brands: brandTotal[0]?.count ?? 0,
    categories: categoryTotal[0]?.count ?? 0,
    newMessages: statusCounts.new,
    statusCounts,
    totalInquiries: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    recentInquiries,
    productsByBrand,
  }
}

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userName = session?.user?.name || 'there'
  const firstName = userName.split(' ')[0]
  
  const data = await getDashboardData()
  const hasWaitingMessages = data.newMessages > 0
  
  return (
    <div className="space-y-10">
      {/* Hero welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-admin-surface-raised to-admin-surface-elevated border border-admin-border p-8 md:p-10">
        <div className="absolute top-0 right-0 size-80 rounded-full bg-admin-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-admin-info/5 blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-admin-text-muted mb-3">
              Welcome back
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-medium text-admin-text-primary tracking-tight">
              Hello, {firstName}<span className="text-admin-accent">.</span>
            </h1>
            <p className="font-body text-base text-admin-text-secondary mt-3 max-w-xl">
              {hasWaitingMessages
                ? `You have ${data.newMessages} new ${data.newMessages === 1 ? 'message' : 'messages'} waiting for a response. Your catalog has ${data.products} products across ${data.brands} brands.`
                : `Your catalog has ${data.products} products across ${data.brands} brands, organized in ${data.categories} categories. Everything is up to date.`}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {hasWaitingMessages && (
                <Link href="/admin/inquiries?status=new">
                  <Button variant="primary">
                    Reply to messages
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
              <Link href="/admin/products/new">
                <Button variant="secondary">
                  <Sparkles size={14} />
                  Add product
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stat grid */}
      <section>
        <h2 className="font-display text-xl font-medium text-admin-text-primary mb-5">
          Catalog overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Products" 
            value={data.products}
            hint={`${data.featuredProducts} featured`}
            icon={Package}
            iconColor="accent"
            href="/admin/products"
          />
          <StatCard 
            label="Brands" 
            value={data.brands}
            icon={Tag}
            iconColor="info"
            href="/admin/brands"
          />
          <StatCard 
            label="Categories" 
            value={data.categories}
            icon={FolderOpen}
            iconColor="success"
            href="/admin/categories"
          />
          <StatCard 
            label="New messages" 
            value={data.newMessages}
            hint={`${data.totalInquiries} total`}
            icon={MailQuestion}
            iconColor={hasWaitingMessages ? 'warning' : 'accent'}
            href="/admin/inquiries"
          />
        </div>
      </section>
      
      {/* Two-column: Messages + Brand distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent messages */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-xl font-medium text-admin-text-primary">
              Recent messages
            </h2>
            <Link
              href="/admin/inquiries"
              className="font-body text-sm text-admin-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          
          {data.recentInquiries.length === 0 ? (
            <div className="bg-admin-surface-raised border border-admin-border rounded-2xl">
              <EmptyState
                icon={MailQuestion}
                title="No messages yet"
                description="When customers send inquiries about your products, they will appear here."
              />
            </div>
          ) : (
            <div className="bg-admin-surface-raised border border-admin-border rounded-2xl divide-y divide-admin-border overflow-hidden">
              {data.recentInquiries.map((inq) => (
                <Link
                  key={inq.id}
                  href={`/admin/inquiries/${inq.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-admin-surface-elevated transition-colors"
                >
                  <Avatar name={inq.fullName || '?'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-admin-text-primary truncate">
                      {inq.fullName}
                    </p>
                    <p className="font-body text-xs text-admin-text-muted truncate mt-0.5">
                      About {inq.productName} · {inq.productBrand}
                    </p>
                  </div>
                  <Pill 
                    variant={
                      inq.status === 'new' ? 'info' : 
                      inq.status === 'contacted' ? 'warning' : 
                      inq.status === 'closed' ? 'success' : 
                      'default'
                    }
                  >
                    {inq.status === 'new' ? 'New' : 
                     inq.status === 'contacted' ? 'In progress' : 
                     inq.status === 'closed' ? 'Closed' : 
                     'Spam'}
                  </Pill>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Brand distribution chart */}
        <div>
          <h2 className="font-display text-xl font-medium text-admin-text-primary mb-5">
            By brand
          </h2>
          <Card>
            <div className="space-y-4">
              {data.productsByBrand.map((row) => {
                const pct = data.products > 0 ? (row.count / data.products) * 100 : 0
                return (
                  <div key={row.brandName}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="font-body text-sm font-medium text-admin-text-primary">
                        {row.brandName}
                      </p>
                      <p className="font-mono text-xs text-admin-text-muted">
                        {row.count}
                      </p>
                    </div>
                    <div className="h-2 bg-admin-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-admin-accent rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
```

================================================================
TASK GROUP 5 — PRODUCTS LIST
================================================================

The products list page is one of the most-used pages. Make it 
clean, live-filterable, fast.

src/app/admin/products/page.tsx — REWRITE:

Read the existing implementation first to understand the data 
fetching pattern (likely uses src/server/admin-products-actions.ts 
or src/server/queries.ts). Preserve the existing query logic, 
only change the rendering.

Structure:
- PageHeader with title "Products", description, "+ Add product" button
- Filter bar: SearchInput + 3 FilterSelects (Brand / Category / State) + Tier filter
- DataTable with columns: Image / Name / Brand / Category / Status / Tier / Updated
- Click row → goes to /admin/products/[id]
- Pagination at bottom (preserve existing pagination logic)

The filters update URL params on change. Page is a server component
that reads params and queries accordingly. No "Apply filter" button.

================================================================
TASK GROUP 6 — PRODUCT EDIT FORM (TABBED)
================================================================

The biggest UX win. The current product editor crams everything 
into one long form. Refactor into tabs:

**Tab 1: Basics**
- Name (EN) + Name (FR) — bilingual side-by-side
- Tagline (EN) + Tagline (FR)
- Brand select
- Category select
- Tier select (with description: "Hero = cinematic, Featured = highlighted, Long-tail = standard")
- Featured toggle
- Sort order

**Tab 2: Content**
- Description (EN) + Description (FR) — large textareas
- Card spec (EN) + Card spec (FR)
- Search keywords (EN) + Search keywords (FR)

**Tab 3: Specs**
- The JSON specs editor (key-value pairs, add/remove rows)

**Tab 4: Media**
- Card image upload
- Hero image upload
- (existing image upload component from Phase 7d)

**Tab 5: SEO**
- Slug (with auto-generate from name + edit button)
- SEO title
- SEO description

Each tab uses Field + Input + Textarea v2 components. 

The save bar is sticky at the bottom of the viewport with:
- "Cancel" button (ghost)
- "Save changes" button (primary)

Cmd+S still works (use existing useKeyboardShortcut hook).

src/app/admin/products/[productId]/page.tsx and 
src/components/admin/products/ProductForm.tsx — REWRITE.

Keep the existing server actions (updateProduct, archiveProduct, 
restoreProduct). Only change the rendering and form structure.

================================================================
TASK GROUP 7 — PRODUCT NEW FORM
================================================================

The "Add product" form should be SIMPLER than edit. New products
only need essentials:

- Name (EN) — required
- Brand — required
- Category — required
- Tier — required (default: longtail)

Then click "Create" and redirect to the full edit form to fill in 
the rest. This is the "wizard pattern" that makes simple things easy.

src/app/admin/products/new/page.tsx — REWRITE.

================================================================
TASK GROUP 8 — PRODUCT IMPORT WIZARD
================================================================

The existing CSV import wizard at /admin/products/import works 
functionally. Just restyle it to use v2 components. Keep the 
3-step flow (Upload → Map → Review). Each step uses the new
Card / Button / Field components.

================================================================
TASK GROUP 9 — INQUIRIES LIST
================================================================

src/app/admin/inquiries/page.tsx — REWRITE:

Structure:
- PageHeader with title "Messages", count of new inquiries
- Filter bar: SearchInput + FilterSelect for status (All / New / In progress / Closed / Spam)
- List of inquiry rows (not a table — more like an email inbox):
  - Avatar
  - Customer name (bold) + email
  - Product they're asking about
  - Message preview (first 100 chars)
  - Time ago
  - Status pill
- Row hover, click → /admin/inquiries/[id]

================================================================
TASK GROUP 10 — INQUIRY DETAIL
================================================================

src/app/admin/inquiries/[id]/page.tsx — REWRITE.

Layout (two columns on desktop):

**Left column (main):**
- Customer card: avatar + name + email + phone + company
- Message thread view (current message + any notes Dtech added)
- Status changer with current state highlighted
- Notes editor with autosave (existing functionality)

**Right column (sidebar):**
- Product context: image + name + brand + link to product
- Inquiry meta: submitted date, source, language
- Activity history timeline

================================================================
TASK GROUP 11 — BRANDS LIST + DETAIL
================================================================

Simpler than products. Brands list is a grid of cards:

src/app/admin/brands/page.tsx:
- PageHeader
- Filter bar (search only)
- Grid of brand cards: logo + name + product count + edit button

src/app/admin/brands/[brandId]/page.tsx:
- PageHeader with brand name
- Form with bilingual fields (already in Phase 7e)
- Restyle with v2 components

Same pattern for new brand: src/app/admin/brands/new/page.tsx.

================================================================
TASK GROUP 12 — CATEGORIES LIST + DETAIL
================================================================

Same pattern as brands. Simpler form (fewer fields).

================================================================
TASK GROUP 13 — USERS LIST + DETAIL
================================================================

Existing functionality stays (admin-only access, role management).
Restyle with v2 components.

================================================================
TASK GROUP 14 — NEW: SETTINGS PAGE
================================================================

This is NEW functionality the user explicitly requested.

src/app/admin/settings/page.tsx — CREATE:

Tab-based structure:

**Tab 1: Profile**
- Avatar (display only, based on initials)
- Name field
- Email field (read-only — email changes require re-verification)
- "Save changes" button

**Tab 2: Password**
- Current password (required)
- New password (8+ chars validation)
- Confirm new password
- "Change password" button
- Uses better-auth's changePassword API
- Success/error toast

**Tab 3: Preferences**
- Theme: Dark / Light / System (radio group)
- Future: language preference (display only — not implemented yet)

**Tab 4: Sessions** (basic)
- "Sign out from all devices" button
- Uses authClient.revokeOtherSessions or similar

Create the server action src/server/admin-settings-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { users } from '@/db/schema'

export async function updateProfile(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { ok: false, error: 'Not signed in' }
  
  const name = formData.get('name')?.toString().trim()
  if (!name || name.length < 2) {
    return { ok: false, error: 'Name must be at least 2 characters' }
  }
  
  await db.update(users).set({ name }).where(eq(users.id, session.user.id))
  
  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true }
}

export async function changePassword(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { ok: false, error: 'Not signed in' }
  
  const currentPassword = formData.get('currentPassword')?.toString()
  const newPassword = formData.get('newPassword')?.toString()
  
  if (!currentPassword || !newPassword) {
    return { ok: false, error: 'All fields are required' }
  }
  
  if (newPassword.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters' }
  }
  
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword },
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change password'
    return { ok: false, error: message }
  }
}
```

If better-auth's changePassword API differs in your version, check
the docs and adapt. The intent: verify current password, set new
password if valid.

================================================================
TASK GROUP 15 — CLEANUP
================================================================

Delete the old admin components that are no longer used:
- src/components/admin/ (except admin-v2 which is the new home)
- Actually: rename src/components/admin-v2 to src/components/admin
  after deleting old admin/ contents. This way imports stay clean.

WAIT — that breaks all the existing imports in pages we just 
rewrote. Better approach:

Keep src/components/admin-v2 as the new home. Delete only the 
specific OLD components that are definitely unused after the 
remake. Check each file: is it imported anywhere? If not, delete.

Files definitely unused after remake:
- src/components/admin/Sidebar.tsx (if it exists)
- src/components/admin/AdminHeader.tsx 
- src/components/admin/ui/Stat.tsx (replaced by StatCard)
- The old CommandPalette (we're not adding it back in this remake;
  defer to A-6 if user wants it; for now delete)

Files KEEP (still imported by non-rewritten parts):
- src/components/admin/products/ImageUpload.tsx (Phase 7d, in use)
- src/components/admin/products/ImageManager.tsx (Phase 7d, in use)
- src/components/admin/products/SpecsEditor.tsx (Phase 7c, in use)
- src/components/admin/products/import/* (Phase 7f, restyled but kept)

If unsure whether to delete, grep first:
  grep -rn "from '@/components/admin/[file]'" src/ --include="*.tsx"
If 0 matches → safe to delete. If matches → keep.

================================================================
TASK GROUP 16 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Smoke tests:
  pnpm dev
  Sign in
  Visit /admin — new dashboard
  Try theme toggle (top right) — dark/light switches instantly
  Visit /admin/products — new list with live filters
  Type in search → results update without pressing anything
  Change brand filter → results update
  Click a product → goes to new tabbed editor
  Switch tabs (Basics / Content / Specs / Media / SEO)
  Click Cancel → no save, back to list
  Visit /admin/inquiries — new inbox-style list
  Visit /admin/brands, /admin/categories, /admin/users — all restyled
  Visit /admin/settings — new settings page
  Try changing name → should save
  Try changing password — should work (or error gracefully)

================================================================
TASK GROUP 17 — COMMIT
================================================================

git add .
git commit -m "feat: admin remake — full UI rebuild (monolithic)

CONTEXT:
User feedback after Phase A-1 foundation: 'we're going from bad to 
worse'. User provided 4 reference dashboard images and asked for 
one comprehensive remake instead of multi-session split. This 
commit delivers that.

DESIGN DIRECTION (FROM USER REFERENCES):
- Modern dashboard with colored icon badges in stat cards
- Hero welcome banner with gradient background
- Live search and filtering (no submit buttons)
- Compact icon-only OR wider expressive sidebar
- Inbox-style inquiry list
- Tabbed product editor (5 tabs)
- Theme toggle (dark/light)
- Sticky top bar with global search input

DELIVERED:

Theme system:
- src/components/admin-v2/theme/ThemeProvider.tsx — dark/light context
- src/components/admin-v2/theme/ThemeToggle.tsx — sun/moon toggle
- Light theme tokens added to globals.css under [data-admin-theme='light']
- All admin components use admin-text-* and admin-surface-* tokens
  (theme-aware)

Component library refinement:
- StatCard with colored icon badges (5 color variants)
- PageHeader with breadcrumb + title + description + action slot
- SearchInput with debounced URL param sync (no submit button)
- FilterSelect with instant URL param sync
- DataTable with hover, click-through, status pills
- Tabs / Tab / TabPanel for tabbed forms
- Pill (status badges with icon dots)
- Avatar (initials from name)
- Plus all existing v2 primitives updated to theme-aware tokens

Shell:
- AdminShell with ThemeProvider
- AdminSidebar 280px wide, icon+label, active state with accent
- AdminTopBar with global search, theme toggle, notifications, user chip
- Logo uses /dtech.png (transparent background) in 48px container

Pages rebuilt:
- /admin dashboard with hero banner, stat grid, recent messages, 
  brand distribution bars
- /admin/products with live filters, modern table
- /admin/products/[id] with 5 tabs (Basics, Content, Specs, Media, SEO)
- /admin/products/new with minimal form (4 fields)
- /admin/products/import restyled with v2 components
- /admin/inquiries as inbox-style list
- /admin/inquiries/[id] with two-column layout
- /admin/brands list + detail
- /admin/categories list + detail
- /admin/users list + detail

NEW: Settings page (/admin/settings):
- Profile tab: edit name (email read-only)
- Password tab: change password (current + new + confirm)
- Preferences tab: theme preference
- Sessions tab: sign out all devices
- New server actions in src/server/admin-settings-actions.ts

Cleanup:
- Deleted unused old admin components (Sidebar, AdminHeader, Stat)
- Kept Phase 7d/c image upload/specs editor (still in use)

Existing functionality preserved:
- All server actions, queries, schemas unchanged
- Auth flow unchanged
- Customer site untouched
- Phase 7 admin features (CSV import, soft delete, audit trail, etc.)
  all still work
- Cmd+S save shortcut, Cmd+K command palette (if kept), all preserved

VERIFICATION:
- pnpm lint clean
- pnpm exec tsc --noEmit clean
- pnpm build clean
- Theme toggle works (dark/light persists in localStorage)
- Live search debounces and updates URL
- Live filters update results without submit
- All routes still accessible

OUT OF SCOPE:
- Customer site changes
- Database schema changes
- New features beyond what user requested
- Cmd+K command palette restoration (defer if user requests)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build passes
- [ ] Theme toggle works on /admin
- [ ] /admin/products live search updates without submit button
- [ ] /admin/products filters update without submit button
- [ ] /admin/products/[id] uses tabbed editor
- [ ] /admin/settings page exists with 4 tabs
- [ ] Change password works (try with current ghani123)
- [ ] All admin routes return 200 (signed in)
- [ ] Dtech logo (/dtech.png) renders in sidebar AND topbar (if used)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + per-area summary)
2. Files modified (large list — this is a big commit)
3. Files deleted (the old admin components removed)
4. Build verification outputs
5. Theme toggle verified working
6. Specific note: did all live filters work as expected?
7. Any deviations from spec (especially around better-auth changePassword API)
8. Final commit hash
9. Any pages that came out particularly well — call them out
10. Any pages that needed compromise — call them out

================================================================
DO NOT
================================================================

- Modify customer-facing site
- Change database schema
- Add new dependencies
- Change auth flow logic
- Modify Phase 5 components (shader, scroll)
- Touch /motion or (dev) routes
- Add features not in this spec
- Add Cmd+K command palette (deferred)
- Reintroduce mobile responsive (admin is desktop-only per project scope)

================================================================
FAILURE MODES TO WATCH
================================================================

- If theme toggle causes flash of wrong theme: ThemeProvider sets 
  the attribute in useEffect, so first render is dark. To prevent 
  flash, set initial state from localStorage in a useLayoutEffect 
  or read cookie server-side. Acceptable to have brief flash during
  this remake — polish later.

- If SearchInput resets cursor position on every keystroke: ensure
  the input is fully controlled and value comes from local state, 
  not searchParams directly.

- If filters cause full page reload: use router.replace with 
  startTransition, not router.push without transition.

- If product edit form loses unsaved changes when switching tabs:
  acceptable for this session — tabs share form state via context
  OR each tab is independently saved. Document the choice.

- If better-auth changePassword signature differs: check the version
  in package.json. The API may want { newPassword, currentPassword }
  or different field names. Adapt.

- If Toaster component doesn't exist as v2 component: just import
  whatever toast system the project currently uses. Don't break
  toast functionality.

- If the logo container is too big or too small: the size-12 
  container with 40×40 image inside leaves padding. Adjust to taste 
  if it looks off.

- If light theme contrast is poor on some surfaces: the OKLCH values 
  given should hit WCAG AA but verify by eye. Tune if needed.

- If product editor tabs lose state on Cancel: this is intentional 
  if Cancel = "back to list without saving". Confirm behavior.

- If old admin components have lingering references after deletion: 
  use grep to find them, update imports to v2 paths. Don't leave 
  broken imports.

- If Drizzle relational queries can't satisfy the dashboard's 
  productsByBrand aggregation: use raw SQL with sql template tag 
  as shown.

- If Tailwind v4 @theme doesn't pick up the new color tokens: 
  ensure they're inside @theme block and use --color-* prefix.