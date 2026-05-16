You are executing Phase 7g — Admin Polish for the Dtech Showroom 
project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7f complete (latest commit: 29465f2): CSV/XLSX bulk import
- All 6 prior admin sub-phases (7a-7f) complete
- Real client engagement with Dtech Algérie
- This is the FINAL admin sub-phase. After this, Phase 7 is done 
  and we move to Phase 8 (i18n).
- v2 brand spec is source of truth for visual decisions
- Phase 7e left a technical debt: R2 keys for brand/category 
  logos land under `products/<slug>/` because ImageUpload's 
  productSlug prop is hardcoded into the R2 key prefix. This 
  phase fixes that.

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Final polish pass on the admin tool. Eight tasks: (1) fix R2 prefix 
to organize per-entity (`products/`, `brands/`, `categories/`), (2) 
add cmd/ctrl+S save shortcut on long forms, (3) build cmd+K command 
palette for global navigation and search, (4) make form save bars 
sticky at bottom of viewport, (5) polish empty states with consistent 
helpful copy, (6) add error boundary to admin layout, (7) add 
loading.tsx skeletons for dynamic admin routes, (8) audit and fix 
toast consistency. After this lands, the admin tool is feature-complete 
and Phase 7 is done.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- New features (everything in 7a-7f is the feature set)
- Migrating existing R2 objects (the prefix fix is forward-only; 
  Phase 7e's brand uploads keep their old keys; users can re-upload 
  if they want clean keys, OR a separate migration script can run 
  later)
- Customer-facing site changes
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Modifying v2 brand spec
- Auth flow changes
- New dependencies (cmdk for command palette would be cleaner but 
  adding deps at this stage isn't worth the bundle cost — build 
  it inline with existing primitives)
- Modifying Phase 5 components (product stages, shader hero, 
  scroll choreography)
- French translations of admin UI (Phase 8)
- Touching /motion or any (dev) routes
- Refactoring 7b/7c admin actions to use centralized requireSession 
  (deferred from 7e — still optional)

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. R2 entity-type parameter + ImageUpload prop rename
  2. Update all callers of ImageUpload (ProductForm, BrandForm, 
     CategoryForm)
  3. Sticky save bar pattern for long forms
  4. useKeyboardShortcut hook + Cmd+S save shortcut
  5. CommandPalette component (Cmd+K global search)
  6. Empty state polish audit
  7. Error boundary on admin layout
  8. loading.tsx skeletons for dynamic admin routes
  9. Toast consistency audit
  10. Verification (lint, tsc, build, smoke tests)
  11. Commit

tsc checkpoint after task 2 and task 6.

================================================================
TASK 1 — R2 ENTITY-TYPE PARAMETER
================================================================

Open src/server/admin-image-actions.ts. Find uploadProductImage. 
Modify its signature to accept an entityType parameter:

```typescript
import type { ImageVariant } from '@/lib/image-processing'

export type EntityType = 'product' | 'brand' | 'category'

export async function uploadEntityImage(
  entityType: EntityType,
  entitySlug: string,
  variant: ImageVariant,
  formData: FormData,
): Promise<{ ok: true; result: UploadResult } | { ok: false; error: string }> {
  // ... same body as uploadProductImage, but the R2 key uses 
  // entityType as the prefix
  
  const webpKey = `${entityType}s/${entitySlug}/${variant}-${hash}.webp`
  const avifKey = `${entityType}s/${entitySlug}/${variant}-${hash}.avif`
  
  // ... rest unchanged
}
```

Note the pluralization: `product` → `products/`, `brand` → `brands/`, 
`category` → `categorys/`. Wait — that's wrong for category. Use a 
mapping:

```typescript
const ENTITY_PREFIX: Record<EntityType, string> = {
  product: 'products',
  brand: 'brands',
  category: 'categories',
}

// In the function:
const prefix = ENTITY_PREFIX[entityType]
const webpKey = `${prefix}/${entitySlug}/${variant}-${hash}.webp`
const avifKey = `${prefix}/${entitySlug}/${variant}-${hash}.avif`
```

Keep `uploadProductImage` as a deprecated wrapper for backward 
compat (so any old call sites still work during the transition):

```typescript
/** @deprecated Use uploadEntityImage instead */
export async function uploadProductImage(
  productSlug: string,
  variant: ImageVariant,
  formData: FormData,
) {
  return uploadEntityImage('product', productSlug, variant, formData)
}
```

Same treatment for deleteProductImage — there's nothing entity-specific 
in delete (it operates on a URL), so leave it as-is but add an alias:

```typescript
export async function deleteEntityImage(imageUrl: string) {
  return deleteProductImage(imageUrl)  // identical behavior
}
```

================================================================
TASK 2 — UPDATE IMAGEUPLOAD + IMAGEMANAGER
================================================================

Open src/components/admin/products/ImageUpload.tsx. Change the prop 
from `productSlug` to `entitySlug` + add `entityType`:

```tsx
interface ImageUploadProps {
  label: string
  description?: string
  variant: ImageVariant
  entityType: EntityType  // 'product' | 'brand' | 'category'
  entitySlug: string
  value: string
  onChange: (url: string) => void
}
```

Update the upload call:
```tsx
const result = await uploadEntityImage(entityType, entitySlug, variant, formData)
```

Same change for src/components/admin/products/ImageManager.tsx.

Then update all callers. Find them with:
```
grep -rn "ImageUpload" src/components/admin/ --include="*.tsx"
grep -rn "ImageManager" src/components/admin/ --include="*.tsx"
```

Expected callers:
- src/components/admin/products/ProductForm.tsx → pass entityType="product"
- src/components/admin/brands/BrandForm.tsx → pass entityType="brand"
- src/components/admin/categories/CategoryForm.tsx → pass entityType="category"

Update each to pass the new props. The `productSlug` prop becomes 
`entitySlug` with the same value (the entity's own slug).

After this change, new uploads land at correct R2 prefixes. Existing 
uploads in Phase 7e (brand logos under `products/<slug>/`) stay 
where they are — DB still has correct URLs to them. Future re-uploads 
of those logos will land at the right path.

This is the "forward-only fix" pattern: don't migrate, just stop the 
bleeding.

================================================================
TASK 3 — STICKY SAVE BAR
================================================================

The ProductForm (most complex form) currently has a save bar at the 
bottom with `sticky bottom-0 bg-surface-base py-4 border-t`. Verify 
this is working — it should be sticky. If it's not (or if the 
sticky behavior breaks when content overflows), wrap it correctly.

Pattern for sticky save bar at bottom of viewport:

```tsx
<form className="space-y-6">
  {/* form content with pb-20 to leave room for sticky bar */}
  <div className="space-y-6 pb-20">
    {/* sections */}
  </div>
  
  {/* Sticky save bar */}
  <div className="fixed bottom-0 left-60 right-0 z-10 bg-surface-base/95 backdrop-blur border-t border-surface-overlay">
    <div className="max-w-5xl px-8 py-4 flex items-center justify-between gap-3">
      <div>
        {/* destructive actions left */}
      </div>
      <div className="flex items-center gap-3">
        {/* primary actions right */}
      </div>
    </div>
  </div>
</form>
```

Note `left-60` accounts for the admin sidebar (60 = 240px = sidebar 
width). On mobile/narrow this needs adjusting but admin is desktop-only.

Apply the same pattern to:
- BrandForm
- CategoryForm
- UserForm / UserEditForm

For shorter forms (e.g., UserForm with only 3 fields), the sticky 
bar is overkill — keep them as-is with regular flow buttons. Apply 
sticky only to forms longer than one viewport.

================================================================
TASK 4 — KEYBOARD SHORTCUTS (CMD+S TO SAVE)
================================================================

Create src/hooks/useKeyboardShortcut.ts:

```typescript
import { useEffect } from 'react'

type ModifierKey = 'cmd' | 'ctrl' | 'shift' | 'alt'

interface ShortcutConfig {
  key: string                     // letter or named key like 'Escape'
  modifiers?: ModifierKey[]
  handler: (e: KeyboardEvent) => void
  preventDefault?: boolean
  enabled?: boolean
}

export function useKeyboardShortcut(config: ShortcutConfig) {
  const { 
    key, 
    modifiers = ['cmd'], 
    handler, 
    preventDefault = true,
    enabled = true,
  } = config
  
  useEffect(() => {
    if (!enabled) return
    
    function onKeyDown(e: KeyboardEvent) {
      const keyMatch = e.key.toLowerCase() === key.toLowerCase()
      if (!keyMatch) return
      
      const modMatch = modifiers.every((mod) => {
        if (mod === 'cmd') return e.metaKey || e.ctrlKey  // treat cmd/ctrl as same
        if (mod === 'ctrl') return e.ctrlKey
        if (mod === 'shift') return e.shiftKey
        if (mod === 'alt') return e.altKey
        return false
      })
      
      if (!modMatch) return
      
      if (preventDefault) e.preventDefault()
      handler(e)
    }
    
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, modifiers, handler, preventDefault, enabled])
}
```

Then in each form component (ProductForm, BrandForm, CategoryForm), 
add a Cmd+S handler:

```tsx
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

// Inside the component:
useKeyboardShortcut({
  key: 's',
  modifiers: ['cmd'],
  handler: () => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  },
})

// Add ref to the form element:
const formRef = useRef<HTMLFormElement>(null)

// In JSX:
<form ref={formRef} onSubmit={handleSubmit}>
  ...
</form>
```

This makes Cmd+S (Mac) / Ctrl+S (Windows) save the form without 
the user reaching for the button.

================================================================
TASK 5 — COMMAND PALETTE (CMD+K)
================================================================

Create src/components/admin/CommandPalette.tsx:

```tsx
'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { Search, Package, Tag, FolderOpen, MailQuestion, Users, LayoutDashboard, Plus, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const items: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Overview of inquiries and catalog',
      icon: LayoutDashboard,
      action: () => router.push('/admin'),
      keywords: ['home', 'overview'],
    },
    {
      id: 'nav-products',
      label: 'Products',
      description: 'Manage the product catalog',
      icon: Package,
      action: () => router.push('/admin/products'),
    },
    {
      id: 'action-new-product',
      label: 'New product',
      description: 'Create a new product',
      icon: Plus,
      action: () => router.push('/admin/products/new'),
      keywords: ['create', 'add'],
    },
    {
      id: 'action-import',
      label: 'Import products',
      description: 'Bulk import from CSV or XLSX',
      icon: Upload,
      action: () => router.push('/admin/products/import'),
      keywords: ['csv', 'xlsx', 'bulk', 'upload'],
    },
    {
      id: 'nav-inquiries',
      label: 'Inquiries',
      description: 'Customer inquiries and messages',
      icon: MailQuestion,
      action: () => router.push('/admin/inquiries'),
      keywords: ['messages', 'contact', 'leads'],
    },
    {
      id: 'nav-brands',
      label: 'Brands',
      description: 'Manage brand information',
      icon: Tag,
      action: () => router.push('/admin/brands'),
    },
    {
      id: 'nav-categories',
      label: 'Categories',
      description: 'Manage product categories',
      icon: FolderOpen,
      action: () => router.push('/admin/categories'),
    },
    {
      id: 'nav-users',
      label: 'Users',
      description: 'Manage admin and staff users',
      icon: Users,
      keywords: ['staff', 'team', 'admin'],
      action: () => router.push('/admin/users'),
    },
  ]
  
  // Filter items
  const filtered = items.filter((item) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.toLowerCase().includes(q))
    )
  })
  
  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Focus input after a tick (allow modal animation)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])
  
  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])
  
  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) {
          selected.action()
          onOpenChange(false)
        }
      }
    }
    
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, selectedIndex, onOpenChange])
  
  if (!open) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm" />
      
      {/* Palette */}
      <div 
        className="relative w-full max-w-xl bg-surface-elevated rounded-lg shadow-2xl border border-surface-overlay overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-overlay">
          <Search size={18} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search admin..."
            className="flex-1 bg-transparent outline-none font-body text-base text-text-primary placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Results */}
        <ul className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center font-body text-sm text-text-muted">
              No matches for "{query}"
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      item.action()
                      onOpenChange(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-surface-overlay' : 'hover:bg-surface-overlay/50',
                    )}
                  >
                    <Icon size={16} className={cn(isSelected ? 'text-accent' : 'text-text-muted')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-text-primary">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="font-body text-xs text-text-muted truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-surface-overlay flex items-center justify-between text-text-muted">
          <p className="font-mono text-xs">
            ↑↓ navigate · ↵ select · esc close
          </p>
        </div>
      </div>
    </div>
  )
}
```

Then wire it into the admin layout. Open src/app/admin/layout.tsx 
and add a client-side wrapper:

Create src/components/admin/CommandPaletteProvider.tsx:

```tsx
'use client'

import { useState } from 'react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { CommandPalette } from './CommandPalette'

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  
  useKeyboardShortcut({
    key: 'k',
    modifiers: ['cmd'],
    handler: () => setOpen((v) => !v),
  })
  
  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
```

Update src/app/admin/layout.tsx to wrap children with the provider:

```tsx
import { CommandPaletteProvider } from '@/components/admin/CommandPaletteProvider'

// In the return:
<CommandPaletteProvider>
  <main className="flex-1 px-8 py-8 overflow-y-auto">
    {children}
  </main>
</CommandPaletteProvider>
```

The provider renders children and adds the palette at the document 
level. Cmd+K triggers it from anywhere in the admin.

Also add a visual hint in AdminHeader showing the Cmd+K shortcut:

```tsx
{/* In AdminHeader, before the user menu: */}
<div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated text-text-muted">
  <Search size={12} />
  <span className="font-mono text-xs">⌘K</span>
</div>
```

Make it clickable to also open the palette (for users who prefer 
mouse). Use a button + dispatch a custom event or refactor to 
context. Simplest: leave it as a visual hint only.

================================================================
TASK 6 — EMPTY STATE POLISH
================================================================

Audit every "no data yet" state in admin. Look for patterns like:

- `<p>No inquiries yet.</p>`
- `<CardContent>No data.</CardContent>`
- Empty `<ul>` rendering with no fallback

Standardize all empty states to use a consistent component.

Create src/components/admin/ui/EmptyState.tsx:

```tsx
import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="px-6 py-16 text-center">
      <Icon size={40} className="mx-auto text-text-muted mb-4" strokeWidth={1.5} />
      <p className="font-body text-base text-text-primary">{title}</p>
      {description && (
        <p className="font-body text-sm text-text-muted mt-2 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <Link href={action.href} className="inline-block mt-4">
          <Button variant="primary">{action.label}</Button>
        </Link>
      )}
    </div>
  )
}
```

Then replace empty states across admin pages:

- /admin/inquiries (no inquiries): icon=Mailbox, "No inquiries yet", 
  "Customer inquiries from the contact form will appear here."
- /admin/products (no products): icon=Package, "No products yet", 
  action: "Add the first product" → /admin/products/new
- /admin/brands: icon=Tag, "No brands yet", action: "Add the first 
  brand" → /admin/brands/new
- /admin/categories: icon=FolderOpen, "No categories yet", action: 
  "Add the first category" → /admin/categories/new
- /admin/users: icon=Users, "No users yet", action: "Add a user" → 
  /admin/users/new

Pull the existing empty state code from each page and replace with 
EmptyState. Keep the wrapping Card.

================================================================
TASK 7 — ERROR BOUNDARY ON ADMIN LAYOUT
================================================================

Create src/app/admin/error.tsx:

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/admin/ui/Button'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin-error]', error)
  }, [error])
  
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md text-center">
        <AlertCircle size={48} className="mx-auto text-semantic-error mb-4" strokeWidth={1.5} />
        <h1 className="font-display text-2xl text-text-primary tracking-tight">
          Something went wrong<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-base text-text-secondary mt-3">
          An error occurred while loading this page. The team has been notified.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-text-muted mt-2">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft size={14} />
              Dashboard
            </Button>
          </Link>
          <Button variant="primary" onClick={reset}>
            <RefreshCw size={14} />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
```

Next.js App Router uses error.tsx as an error boundary for the 
nearest layout segment. Placing it at /admin/error.tsx catches 
errors from any admin route while keeping the sidebar/header rendered.

================================================================
TASK 8 — LOADING SKELETONS
================================================================

Add loading.tsx files for dynamic admin routes that fetch data on 
the server. Next.js shows these immediately while server data loads.

Create src/components/admin/ui/Skeleton.tsx:

```tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-overlay/40',
        className
      )}
      {...props}
    />
  )
}
```

Create src/app/admin/products/loading.tsx:

```tsx
import { Card } from '@/components/admin/ui/Card'
import { Skeleton } from '@/components/admin/ui/Skeleton'

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="w-20 h-3 mb-2" />
          <Skeleton className="w-32 h-8" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-10" />
          <Skeleton className="w-32 h-10" />
        </div>
      </div>
      
      <Card>
        <ul className="divide-y divide-surface-overlay">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="px-6 py-4 flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-48 h-4" />
                <Skeleton className="w-32 h-3" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
```

Create similar loading.tsx files for:
- src/app/admin/inquiries/loading.tsx (list skeleton)
- src/app/admin/brands/loading.tsx
- src/app/admin/categories/loading.tsx
- src/app/admin/users/loading.tsx
- src/app/admin/loading.tsx (dashboard with 4 stat skeletons)

Keep them simple — just enough to show the page shape while data 
loads. Don't try to mock the exact final layout pixel-perfect.

================================================================
TASK 9 — TOAST CONSISTENCY AUDIT
================================================================

Search across admin code for inconsistent toast usage:

```
grep -rn "toast" src/components/admin src/app/admin src/server/admin-* --include="*.tsx" --include="*.ts"
```

Pattern audit:
- All admin actions should use `toast.success` / `toast.error` from 
  '@/lib/toast' (not direct sonner imports)
- Every mutation (create / update / delete / archive / restore) 
  should fire either a success or error toast
- Error toasts should include the specific error message, not just 
  "Something went wrong"
- Success toasts should be specific ("Product created", not "Saved")

Common issues to fix:
- Direct `import { toast } from 'sonner'` should be 
  `import { toast } from '@/lib/toast'`
- Silent failures where a server action returns ok: false but no 
  toast fires
- Generic "Failed" messages that don't explain what failed

Don't refactor for the sake of refactoring — only fix actual 
inconsistencies. Leave working code alone.

================================================================
TASK 10 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Smoke tests:

  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Admin routes (all 307):
  $adminRoutes = @(
    '/admin',
    '/admin/products',
    '/admin/inquiries',
    '/admin/brands',
    '/admin/categories',
    '/admin/users',
    '/admin/products/import',
    '/admin/products/new'
  )
  foreach ($r in $adminRoutes) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r" }
  }

Public regression:
  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/about')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

Stop:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 11 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7g — admin polish (final admin sub-phase)

R2 ORGANIZATION FIX:
- uploadEntityImage replaces uploadProductImage as the canonical action
- entityType parameter ('product' | 'brand' | 'category') drives R2 key 
  prefix: products/, brands/, categories/
- ImageUpload + ImageManager accept entityType + entitySlug props
- ProductForm, BrandForm, CategoryForm updated with new props
- Forward-only fix: existing Phase 7e uploads keep their old keys; 
  re-uploads land at correct paths

KEYBOARD SHORTCUTS:
- useKeyboardShortcut hook handles cmd/ctrl+key with modifier matching
- Cmd+S triggers form save on ProductForm, BrandForm, CategoryForm
- Cmd+K opens command palette globally in admin
- Escape closes command palette

COMMAND PALETTE:
- CommandPalette overlay with search, fuzzy matching on label/description/keywords
- 8 default commands: dashboard, products, new product, import, inquiries, brands, categories, users
- Keyboard navigation: arrow keys + enter + escape
- Mouse hover updates selection
- Visual ⌘K hint in AdminHeader

STICKY SAVE BARS:
- Long forms (Product, Brand, Category) have fixed-position save bars
- Account for 240px sidebar via left-60 offset
- Pb-20 on form content reserves space

EMPTY STATES:
- src/components/admin/ui/EmptyState.tsx — consistent component
- Replaces ad-hoc empty messages across admin
- Optional action CTA (e.g., 'Add the first product')

ERROR BOUNDARY:
- src/app/admin/error.tsx — catches errors in any admin route
- Shows friendly error UI with error digest, retry, and back-to-dashboard
- Logs errors to console for debugging

LOADING SKELETONS:
- src/components/admin/ui/Skeleton.tsx — pulse animation
- loading.tsx files for /admin, /admin/products, /admin/inquiries, 
  /admin/brands, /admin/categories, /admin/users
- Show structure while server data loads (instant perceived response)

TOAST AUDIT:
- All admin actions use @/lib/toast (not direct sonner imports)
- Error toasts surface specific messages
- Success toasts are context-specific

PHASE 7 COMPLETE. Admin tool is feature-complete and production-ready.
Next: Phase 8 — internationalization (English + French routing)."

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] R2 entity-type parameter in upload action
- [ ] ImageUpload accepts entityType + entitySlug
- [ ] All form callers updated
- [ ] useKeyboardShortcut hook created
- [ ] Cmd+S triggers save on long forms
- [ ] Cmd+K opens command palette
- [ ] Command palette has 8 commands, keyboard nav, fuzzy filter
- [ ] Sticky save bars on long forms
- [ ] EmptyState component created and applied to admin lists
- [ ] /admin/error.tsx exists
- [ ] loading.tsx files for 6 admin routes
- [ ] Skeleton component created
- [ ] Toast imports consistent
- [ ] Public regression all 200
- [ ] All admin routes redirect 307
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary per category)
2. Files modified (especially the form components for new image 
   props and Cmd+S handlers)
3. Build verification outputs
4. Smoke test results
5. Confirmation Phase 7 is complete (all 7 sub-phases done)
6. Any deviations from spec
7. Final commit hash

================================================================
DO NOT
================================================================

- Add new features
- Migrate existing R2 objects (forward-only fix)
- Modify customer-facing site
- Modify v2 brand spec or admin UI primitives beyond what's specified
- Add new dependencies (build palette inline, don't add cmdk)
- Refactor 7b/7c admin actions to centralized requireSession (deferred)
- Modify auth flow
- Touch /motion or (dev) routes
- Build a settings page (defer to post-launch)

================================================================
FAILURE MODES TO WATCH
================================================================

- If cmd+s prevents browser save dialog but doesn't trigger form 
  submit: confirm formRef.current.requestSubmit() is being called. 
  requestSubmit() triggers the form's onSubmit handler with proper 
  event flow; calling submit() bypasses validation.

- If cmd+k triggers in input fields: useKeyboardShortcut doesn't 
  filter for input focus. For cmd+k, this is intentional — palette 
  should open from anywhere. For cmd+s, the form context handles 
  it correctly via requestSubmit().

- If command palette filter is slow with many items: 8 items is 
  fine. If we grow to 50+ later, consider fuse.js or fzf-style 
  ranking. Don't preemptively add that now.

- If R2 prefix change breaks existing image displays: shouldn't — 
  the URLs in DB still point to where the images actually are. The 
  fix is purely for FUTURE uploads. Old paths stay valid.

- If sticky save bar overlaps content: ensure pb-20 (or 24) on the 
  form's inner div leaves room. Test by scrolling to bottom.

- If loading.tsx renders during instant client-side nav: this is 
  Next.js behavior — loading.tsx shows during server-rendered 
  transitions. For purely client-side nav (Link to same layout), 
  no loading shown. Both are correct.

- If error.tsx doesn't catch a server-rendered error: error.tsx 
  catches client errors and rendering errors. Server-action errors 
  (thrown in 'use server' functions) are caught by the calling 
  component's try/catch or fall through. Verify by intentionally 
  throwing in a Server Component.

- If EmptyState replacement breaks existing layouts: the existing 
  empty states use various wrappers (Card, plain div, etc). Some 
  may not fit cleanly inside EmptyState's centered layout. Keep 
  the wrapper Card and put EmptyState inside it.

- If skeleton pulse animation distracts: animate-pulse from 
  Tailwind is subtle by default. If feedback says too much, reduce 
  to 'animate-pulse [animation-duration:2.5s]' for slower pulse.

- If toast import refactor accidentally removes a working toast: 
  carefully audit each replacement. Imports from 'sonner' directly 
  still work — they go to the same Toaster — but the audit goal 
  is consistency, not breaking changes.

- If R2 alias (deleteEntityImage) is unused: it's there for 
  forward compat / API symmetry. The lint may complain about unused 
  export. Either suppress with /* eslint-disable */ comment or 
  remove if no callers use it yet.

================================================================
WHAT HAPPENS AFTER THIS LANDS
================================================================

After Phase 7g commits, Phase 7 is DONE. The admin tool is 
feature-complete. Dtech can manage the entire catalog without 
developer involvement.

Next session: Phase 8 — internationalization.
- Install next-intl
- Add [locale] route segment
- Translation files for EN + FR
- Locale-aware metadata
- hreflang tags
- Per-locale sitemaps
- Update public queries to read _fr columns with fallback
- Admin UI stays English-only (per scope)

Phase 8 is the biggest single phase remaining. Plan ~4-5 hours of 
focused Claude Code work + translation time.