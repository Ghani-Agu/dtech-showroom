You are executing Phase 7e — Brands, Categories, and Users Management 
for the Dtech Showroom project. Read this entire prompt before doing 
anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7d complete (latest commit: 58154cf): R2 image upload, sharp 
  processing, ImageUpload + ImageManager components
- Phase 7c established patterns: bilingual fields, soft delete, 
  ProductForm with sections, Zod validation, auth-guarded server 
  actions
- v2 brand spec is source of truth for visual decisions
- Architecture LOCKED:
  - Translation: _fr columns on existing tables
  - Image storage: Cloudflare R2 (works the same as products)
  - Auth: better-auth with admin | staff roles
- This is Phase 7e of 7 (7a-7d done, 7f+7g remaining)
- Admin tool stays English-only (only CONTENT is bilingual)

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Build three CRUD interfaces reusing established patterns from 7c/7d. 
For brands: schema additions (_fr columns + archivedAt + heroImagePath 
+ logoImagePath if not present), Zod validation, server actions, list 
+ new + edit pages with bilingual fields and R2 image upload. For 
categories: same pattern but no logo (only heroImagePath). For users: 
list, create, edit, deactivate pages with admin-only access guard (not 
just session check, but explicit role === 'admin' check); password 
reset triggers Resend email; new user creation triggers welcome email 
with set-password link. Update customer-facing brand/category queries 
to exclude archived. Update admin sidebar to enforce admin-only visibility 
on Users link (already done in 7a, verify).

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- CSV import (Phase 7f)
- Keyboard shortcuts / cmd+k (Phase 7g)
- Bulk operations
- Profile images for users (defer — Dtech is small team, names + 
  emails are enough)
- 2FA / MFA for user accounts
- Email verification flow on user creation (set-password via emailed 
  link is sufficient)
- French translations of admin UI labels (Phase 8)
- Modifying customer-facing brand landing page UI
- Modifying customer-facing category landing page UI
- Modifying auth flow itself (login/forgot/reset stay as-is)
- Modifying v2 brand spec, brand-tokens.ts, fonts.ts
- Touching /motion or any (dev) routes
- Adding 3D model fields to brand/category schemas

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Schema additions (brands: _fr columns + archivedAt + indexes; 
     categories: same)
  2. Migration (db:push --force, additive only)
  3. Zod schemas (brand + category + user)
  4. Server actions for brands (create/update/archive/restore)
  5. Server actions for categories (create/update/archive/restore)
  6. Server actions for users (create/update/deactivate/sendReset)
  7. Brand list page + form (bilingual + logo + hero)
  8. Category list page + form (bilingual + hero)
  9. User list page + form (admin-only access)
  10. Helper: requireAdminRole utility
  11. Update customer-facing brand/category queries (exclude archived)
  12. Verification (lint, tsc, build, smoke tests)
  13. Commit

tsc checkpoint after task 6 and task 10.

================================================================
TASK 1 — SCHEMA ADDITIONS
================================================================

Open src/db/schema.ts. Find the brands table and the categories table.

Step 1.1: Brands schema additions

Add to the existing brands pgTable definition (do NOT remove existing 
columns):

```typescript
// Bilingual columns (Phase 7e — same pattern as products in 7c)
nameFr: text('name_fr'),
statementFr: text('statement_fr'),
descriptionFr: text('description_fr'),
searchKeywordsFr: text('search_keywords_fr'),  // if searchKeywords exists; add if not

// Soft delete
archivedAt: timestamp('archived_at'),
```

If brands doesn't already have `heroImagePath`, `logoImagePath`, or 
`searchKeywords` columns, add them as nullable text:

```typescript
// If not present:
heroImagePath: text('hero_image_path'),
logoImagePath: text('logo_image_path'),
searchKeywords: text('search_keywords'),
```

Audit the existing brands schema first — most projects have heroImagePath 
already but may not have logoImagePath. Add only what's missing.

Add an index:

```typescript
// In the brands pgTable third arg:
archivedAtIdx: index('brands_archived_at_idx').on(table.archivedAt),
```

Step 1.2: Categories schema additions

Same pattern for categories. Add:

```typescript
nameFr: text('name_fr'),
descriptionFr: text('description_fr'),
searchKeywordsFr: text('search_keywords_fr'),  // if exists; skip if not in schema

archivedAt: timestamp('archived_at'),
```

If categories doesn't have heroImagePath, add it:

```typescript
heroImagePath: text('hero_image_path'),
```

Add index:

```typescript
archivedAtIdx: index('categories_archived_at_idx').on(table.archivedAt),
```

Step 1.3: Audit users schema

The users table from Phase 6 has:
- id (text), email (text unique), name (text), role (enum 
  admin|staff), emailVerified (boolean), image (text nullable), 
  createdAt, updatedAt

Add columns needed for management:

```typescript
// In existing users pgTable (do NOT remove anything):
deactivatedAt: timestamp('deactivated_at'),  // nullable; null = active
lastLoginAt: timestamp('last_login_at'),     // nullable; updated by better-auth or by us
```

Add index:

```typescript
deactivatedAtIdx: index('users_deactivated_at_idx').on(table.deactivatedAt),
```

================================================================
TASK 2 — APPLY MIGRATION
================================================================

Run:
  pnpm db:push --force

Additive only. Should add:
- brands: 4-6 new columns + 1 index (depending on what was already there)
- categories: 3-4 new columns + 1 index
- users: 2 new columns + 1 index

Verify via:
  pnpm db:studio

Look for:
- brands.name_fr, statement_fr, description_fr, search_keywords_fr, 
  archived_at (+ hero_image_path, logo_image_path, search_keywords 
  if newly added)
- categories.name_fr, description_fr, search_keywords_fr, archived_at 
  (+ hero_image_path if newly added)
- users.deactivated_at, last_login_at
- All three new indexes

================================================================
TASK 3 — ZOD SCHEMAS
================================================================

Create src/lib/validations/brand.ts:

```typescript
import { z } from 'zod'

const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only',
  })

export const brandFormSchema = z.object({
  slug: slugSchema,
  
  // English (required)
  name: z.string().min(1).max(120),
  statement: z.string().max(300).optional().default(''),
  description: z.string().max(3000).optional().default(''),
  searchKeywords: z.string().max(300).optional().default(''),
  
  // French (optional)
  nameFr: z.string().max(120).optional().default(''),
  statementFr: z.string().max(300).optional().default(''),
  descriptionFr: z.string().max(3000).optional().default(''),
  searchKeywordsFr: z.string().max(300).optional().default(''),
  
  // Display
  sortOrder: z.number().int().min(0).max(9999).default(100),
  
  // Images
  logoImagePath: z.string().max(500).optional().default(''),
  heroImagePath: z.string().max(500).optional().default(''),
})

export type BrandFormValues = z.infer<typeof brandFormSchema>
```

Create src/lib/validations/category.ts:

```typescript
import { z } from 'zod'

const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only',
  })

export const categoryFormSchema = z.object({
  slug: slugSchema,
  
  name: z.string().min(1).max(120),
  description: z.string().max(3000).optional().default(''),
  searchKeywords: z.string().max(300).optional().default(''),
  
  nameFr: z.string().max(120).optional().default(''),
  descriptionFr: z.string().max(3000).optional().default(''),
  searchKeywordsFr: z.string().max(300).optional().default(''),
  
  sortOrder: z.number().int().min(0).max(9999).default(100),
  
  heroImagePath: z.string().max(500).optional().default(''),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
```

Create src/lib/validations/user.ts:

```typescript
import { z } from 'zod'

export const userCreateSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'staff']),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'staff']),
})

export type UserCreateValues = z.infer<typeof userCreateSchema>
export type UserUpdateValues = z.infer<typeof userUpdateSchema>
```

================================================================
TASK 4 — ROLE GUARD UTILITY
================================================================

Create src/lib/auth-helpers.ts:

```typescript
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { auth } from './auth'

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
  if (!session) return null
  
  // Get role from DB (not in session by default)
  const user = await db
    .select({ id: users.id, email: users.email, role: users.role, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)
  
  return user
}

export async function requireSession() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin() {
  const user = await requireSession()
  if (user.role !== 'admin') {
    throw new Error('Forbidden: admin role required')
  }
  return user
}
```

Now update Phase 7c's `requireSession()` in src/server/admin-product-actions.ts 
to import from this helper instead of duplicating the logic. Same for 
the inquiry actions. Reduces duplication.

(If easier, leave the existing requireSession in those files for now 
and just use the new helpers in the new files. Don't refactor for 
the sake of refactoring.)

================================================================
TASK 5 — BRAND SERVER ACTIONS
================================================================

Create src/server/admin-brand-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { brands } from '@/db/schema'
import { requireSession } from '@/lib/auth-helpers'
import { brandFormSchema, type BrandFormValues } from '@/lib/validations/brand'

function normalize(values: BrandFormValues) {
  return {
    ...values,
    nameFr: values.nameFr || null,
    statementFr: values.statementFr || null,
    descriptionFr: values.descriptionFr || null,
    searchKeywordsFr: values.searchKeywordsFr || null,
    logoImagePath: values.logoImagePath || null,
    heroImagePath: values.heroImagePath || null,
  }
}

export async function createBrand(values: BrandFormValues) {
  await requireSession()
  
  const parsed = brandFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors } as const
  }
  
  // Slug uniqueness
  const existing = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])
  
  if (existing) {
    return {
      ok: false,
      errors: { slug: ['A brand with this slug already exists'] },
    } as const
  }
  
  const inserted = await db
    .insert(brands)
    .values(normalize(parsed.data))
    .returning({ id: brands.id })
  
  revalidatePath('/admin/brands')
  revalidatePath('/brands')
  revalidatePath('/')
  
  const newId = inserted[0]?.id
  if (!newId) return { ok: false, errors: { _form: ['Insert failed'] } } as const
  return { ok: true, id: newId } as const
}

export async function updateBrand(brandId: string, values: BrandFormValues) {
  await requireSession()
  
  const parsed = brandFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors } as const
  }
  
  const slugTaken = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])
  
  if (slugTaken && slugTaken.id !== brandId) {
    return {
      ok: false,
      errors: { slug: ['A brand with this slug already exists'] },
    } as const
  }
  
  await db
    .update(brands)
    .set({ ...normalize(parsed.data), updatedAt: new Date() })
    .where(eq(brands.id, brandId))
  
  revalidatePath('/admin/brands')
  revalidatePath(`/admin/brands/${brandId}/edit`)
  revalidatePath(`/brands/${parsed.data.slug}`)
  revalidatePath('/brands')
  revalidatePath('/')
  
  return { ok: true, id: brandId } as const
}

export async function archiveBrand(brandId: string) {
  await requireSession()
  
  await db
    .update(brands)
    .set({ archivedAt: new Date() })
    .where(eq(brands.id, brandId))
  
  revalidatePath('/admin/brands')
  revalidatePath('/brands')
  
  return { ok: true } as const
}

export async function restoreBrand(brandId: string) {
  await requireSession()
  
  await db
    .update(brands)
    .set({ archivedAt: null })
    .where(eq(brands.id, brandId))
  
  revalidatePath('/admin/brands')
  revalidatePath('/brands')
  
  return { ok: true } as const
}
```

================================================================
TASK 6 — CATEGORY SERVER ACTIONS
================================================================

Create src/server/admin-category-actions.ts following the SAME pattern 
as admin-brand-actions.ts, adjusting for the categoryFormSchema and 
the categories table.

Key differences from brands:
- No logoImagePath field
- Slightly different revalidation targets: /categories instead of /brands
- Same archive/restore pattern

(Full code follows same structure; copy from Task 5 and adapt 
field names + table.)

================================================================
TASK 7 — USER SERVER ACTIONS
================================================================

Create src/server/admin-user-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, sessions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { 
  userCreateSchema, 
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
} from '@/lib/validations/user'
import { generateHash } from '@/lib/r2'  // reuse for password generation
import { resend, getFromHeader } from '@/lib/email'

/**
 * Creates a new user with a randomly generated password.
 * Sends them an email with a set-password link.
 * Admin-only.
 */
export async function createUser(values: UserCreateValues) {
  await requireAdmin()
  
  const parsed = userCreateSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors } as const
  }
  
  // Check email uniqueness
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)
    .then((rows) => rows[0])
  
  if (existing) {
    return {
      ok: false,
      errors: { email: ['A user with this email already exists'] },
    } as const
  }
  
  // Create user via better-auth (handles password hashing)
  // Generate a random temporary password (user will reset via email)
  const tempPassword = generateHash('temp') + generateHash('pw') + 'A1!'
  
  try {
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: tempPassword,
        name: parsed.data.name,
      },
    })
    
    // Set role explicitly (signUpEmail defaults to 'staff')
    if (parsed.data.role !== 'staff') {
      await db
        .update(users)
        .set({ role: parsed.data.role })
        .where(eq(users.email, parsed.data.email))
    }
    
    // Trigger password reset email so the user can set their own password
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: '/reset-password',
      },
    }).catch((err) => {
      console.error('[user-create] Failed to send reset email:', err)
    })
    
    revalidatePath('/admin/users')
    
    return { ok: true } as const
  } catch (err) {
    console.error('[user-create] Failed:', err)
    return {
      ok: false,
      errors: { _form: ['Failed to create user'] },
    } as const
  }
}

export async function updateUser(userId: string, values: UserUpdateValues) {
  const admin = await requireAdmin()
  
  // Prevent self-demotion
  if (admin.id === userId && values.role !== 'admin') {
    return {
      ok: false,
      errors: { role: ['You cannot remove your own admin role'] },
    } as const
  }
  
  const parsed = userUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors } as const
  }
  
  await db
    .update(users)
    .set({ 
      name: parsed.data.name, 
      role: parsed.data.role, 
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
  
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}/edit`)
  
  return { ok: true } as const
}

export async function deactivateUser(userId: string) {
  const admin = await requireAdmin()
  
  if (admin.id === userId) {
    return { ok: false, error: 'You cannot deactivate yourself' } as const
  }
  
  await db
    .update(users)
    .set({ deactivatedAt: new Date() })
    .where(eq(users.id, userId))
  
  // Also delete all active sessions for this user (force logout)
  await db.delete(sessions).where(eq(sessions.userId, userId))
  
  revalidatePath('/admin/users')
  
  return { ok: true } as const
}

export async function reactivateUser(userId: string) {
  await requireAdmin()
  
  await db
    .update(users)
    .set({ deactivatedAt: null })
    .where(eq(users.id, userId))
  
  revalidatePath('/admin/users')
  
  return { ok: true } as const
}

export async function triggerPasswordReset(userId: string) {
  await requireAdmin()
  
  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!user) {
    return { ok: false, error: 'User not found' } as const
  }
  
  await auth.api.requestPasswordReset({
    body: {
      email: user.email,
      redirectTo: '/reset-password',
    },
  }).catch((err) => {
    console.error('[password-reset] Failed:', err)
  })
  
  return { ok: true } as const
}
```

================================================================
TASK 8 — BRAND LIST + FORM
================================================================

Create src/app/admin/brands/page.tsx (list view):

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/db/client'
import { brands } from '@/db/schema'
import { isNull, isNotNull, asc, count } from 'drizzle-orm'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Button } from '@/components/admin/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { Plus, CircleDashed } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Brands — Dtech Admin',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ state?: 'active' | 'archived' | 'all' }>
}

function validateState(s?: string): 'active' | 'archived' | 'all' {
  return s === 'archived' || s === 'all' ? s : 'active'
}

export default async function BrandsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)
  
  const whereClause = 
    state === 'active' ? isNull(brands.archivedAt) :
    state === 'archived' ? isNotNull(brands.archivedAt) :
    undefined
  
  const rows = await db
    .select()
    .from(brands)
    .where(whereClause)
    .orderBy(asc(brands.sortOrder), asc(brands.name))
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Brands
          </p>
          <h1 className="font-display text-3xl text-text-primary tracking-tight">
            Brands<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/brands/new">
          <Button variant="primary">
            <Plus size={16} />
            New brand
          </Button>
        </Link>
      </div>
      
      {/* State filter tabs */}
      <div className="flex items-center gap-2">
        {(['active', 'archived', 'all'] as const).map((s) => {
          const isActive = state === s
          const href = s === 'active' ? '/admin/brands' : `/admin/brands?state=${s}`
          return (
            <Link
              key={s}
              href={href}
              className={
                isActive
                  ? 'inline-flex items-center px-2.5 py-1 rounded-full bg-surface-overlay text-text-primary font-body text-xs font-medium'
                  : 'inline-flex items-center px-2.5 py-1 rounded-full text-text-secondary hover:text-text-primary font-body text-xs transition-colors'
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          )
        })}
      </div>
      
      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed size={40} className="mx-auto text-text-muted mb-4" />
            <p className="font-body text-base text-text-secondary">
              No {state !== 'all' ? state : ''} brands.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((brand) => {
              const hasFr = brand.nameFr !== null && brand.nameFr.length > 0
              const isArchived = brand.archivedAt !== null
              return (
                <li key={brand.id}>
                  <Link
                    href={`/admin/brands/${brand.id}/edit`}
                    className={
                      isArchived
                        ? 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors opacity-60'
                        : 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors'
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded bg-surface-elevated flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {brand.logoImagePath ? (
                          <Image src={brand.logoImagePath} alt="" width={48} height={48} className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="font-mono text-xs text-text-muted">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-body text-base font-medium text-text-primary">
                            {brand.name}
                          </p>
                          {!hasFr && <Badge variant="warning">EN only</Badge>}
                          {isArchived && <Badge variant="neutral">Archived</Badge>}
                        </div>
                        <p className="font-body text-sm text-text-secondary mt-1 truncate">
                          /{brand.slug}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono text-xs text-text-muted">Sort</p>
                        <p className="font-mono text-sm text-text-secondary">{brand.sortOrder}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
```

Create src/app/admin/brands/new/page.tsx and 
src/app/admin/brands/[brandId]/edit/page.tsx following the same 
shape as the product equivalents. Pages render <BrandForm />.

Create src/components/admin/brands/BrandForm.tsx — same structure as 
ProductForm but for brands:

Sections:
1. **Identity** — slug
2. **Content** — name (bilingual), statement (bilingual), description 
   (bilingual textarea), search keywords (bilingual)
3. **Display** — sort order
4. **Images** — logo (ImageUpload with variant='card' or new 'logo' 
   variant — see notes below), hero (ImageUpload with variant='hero')

Logo handling note: the existing ImageUpload component supports 
'card' | 'hero' | 'carousel' variants. For brand logos, use 'card' 
variant (800×600) as a reasonable size, OR add a 'logo' variant to 
image-processing.ts and ImageUpload.tsx supporting square aspect ratio 
(e.g., 600×600 for square logos).

**Decision: add 'logo' variant** for proper logo handling. Update 
src/lib/image-processing.ts:

```typescript
// Add to ImageVariant type:
export type ImageVariant = 'card' | 'hero' | 'carousel' | 'logo'

// Add to VARIANT_SPECS:
logo: {
  width: 600,
  height: 600,
  fit: 'contain',  // contain, not cover, to preserve logo aspect
  quality: { webp: 85, avif: 65 },
},
```

When generating logo variants with `fit: 'contain'`, also add a 
background option in the sharp pipeline to fill with transparent or 
brand color. For now, contain with transparent background works.

Update processVariant to support contain with a background:

```typescript
let pipeline = sharp(sourceBuffer)
  .resize(spec.width, spec.height, {
    fit: spec.fit,
    position: spec.fit === 'cover' ? 'attention' : 'center',
    background: spec.fit === 'contain' ? { r: 0, g: 0, b: 0, alpha: 0 } : undefined,
    withoutEnlargement: false,
  })
```

Then ImageUpload.tsx accepts 'logo' as a valid variant and shows 
aspect-square instead of aspect-4:3.

Update ImageUpload's aspect ratio logic:

```tsx
className={cn(
  'relative overflow-hidden rounded-md bg-surface-elevated',
  variant === 'hero' ? 'aspect-[16/9]' : 
    variant === 'card' || variant === 'carousel' ? 'aspect-[4/3]' :
    variant === 'logo' ? 'aspect-square' : 'aspect-[4/3]'
)}
```

================================================================
TASK 9 — CATEGORY LIST + FORM
================================================================

Same pattern as brands but simpler (no logo, just hero).

Create:
- src/app/admin/categories/page.tsx (list)
- src/app/admin/categories/new/page.tsx
- src/app/admin/categories/[categoryId]/edit/page.tsx
- src/components/admin/categories/CategoryForm.tsx

CategoryForm sections:
1. **Identity** — slug
2. **Content** — name (bilingual), description (bilingual), search keywords (bilingual)
3. **Display** — sort order
4. **Images** — hero (ImageUpload with variant='hero')

Mirror the brand pattern exactly.

================================================================
TASK 10 — USER LIST + FORM (ADMIN-ONLY)
================================================================

Create src/app/admin/users/page.tsx:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { asc, count } from 'drizzle-orm'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Button } from '@/components/admin/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { requireAdmin } from '@/lib/auth-helpers'
import { Plus, CircleDashed } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Users — Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function UsersListPage() {
  // Admin-only — throws if not admin, but we need graceful redirect
  try {
    await requireAdmin()
  } catch {
    redirect('/admin')
  }
  
  const rows = await db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt))
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Users
          </p>
          <h1 className="font-display text-3xl text-text-primary tracking-tight">
            Users<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/users/new">
          <Button variant="primary">
            <Plus size={16} />
            New user
          </Button>
        </Link>
      </div>
      
      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed size={40} className="mx-auto text-text-muted mb-4" />
            <p className="font-body text-base text-text-secondary">No users yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((user) => {
              const isDeactivated = user.deactivatedAt !== null
              return (
                <li key={user.id}>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className={
                      isDeactivated
                        ? 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors opacity-60'
                        : 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors'
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center font-mono text-sm text-text-secondary uppercase flex-shrink-0">
                        {user.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-body text-base font-medium text-text-primary">
                            {user.name}
                          </p>
                          <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>
                            {user.role}
                          </Badge>
                          {isDeactivated && <Badge variant="error">Deactivated</Badge>}
                        </div>
                        <p className="font-body text-sm text-text-secondary mt-1">
                          {user.email}
                        </p>
                      </div>
                      {user.lastLoginAt && (
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-xs text-text-muted">Last login</p>
                          <p className="font-body text-xs text-text-secondary">
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
```

Create:
- src/app/admin/users/new/page.tsx
- src/app/admin/users/[userId]/edit/page.tsx  
- src/components/admin/users/UserForm.tsx (for create)
- src/components/admin/users/UserEditForm.tsx (for edit — different actions: 
  trigger password reset, deactivate, reactivate)

Each page guards with `requireAdmin()` at the top, redirecting to /admin 
if not admin.

UserForm (new) fields: email, name, role (select).
UserEditForm fields: name, role (with self-demotion prevention), action 
buttons for password reset / deactivate / reactivate.

================================================================
TASK 11 — UPDATE PUBLIC QUERIES (EXCLUDE ARCHIVED)
================================================================

Audit src/server/queries.ts (and any other public query locations). 
Find functions that query brands or categories. Add 
`isNull(table.archivedAt)` to each where clause.

Likely affected functions:
- `getBrands()` or `listBrands()`
- `getBrandBySlug(slug)`
- `getCategories()` or `listCategories()`
- `getCategoryBySlug(slug)`

Pattern (same as Phase 7c):

```typescript
// Before:
const brand = await db
  .select()
  .from(brands)
  .where(eq(brands.slug, slug))
  .limit(1)
  
// After:
const brand = await db
  .select()
  .from(brands)
  .where(and(eq(brands.slug, slug), isNull(brands.archivedAt)))
  .limit(1)
```

For listing brands/categories on /brands and /categories index pages, 
add `WHERE archived_at IS NULL`.

For brand/category detail pages, if archived → 404 (same pattern as 
product detail in Phase 7c).

Also update src/app/sitemap.ts to exclude archived brands and categories.

================================================================
TASK 12 — VERIFICATION
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
    '/admin/brands',
    '/admin/brands/new',
    '/admin/brands?state=archived',
    '/admin/categories',
    '/admin/categories/new',
    '/admin/users',
    '/admin/users/new'
  )
  foreach ($r in $adminRoutes) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r" }
  }

Public regression (all 200):
  $existing = @('/', '/brands', '/brands/hp', '/categories', '/categories/laptops', '/products/hp-omen-16-i9-rtx-4070')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

Stop:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 13 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7e — brands, categories, and users management

SCHEMA:
- brands: name_fr, statement_fr, description_fr, search_keywords_fr, 
  archived_at columns; brands_archived_at_idx index; logo_image_path 
  if not present
- categories: name_fr, description_fr, search_keywords_fr, archived_at 
  columns; categories_archived_at_idx index; hero_image_path if not present
- users: deactivated_at, last_login_at columns; users_deactivated_at_idx index

VALIDATION:
- src/lib/validations/brand.ts
- src/lib/validations/category.ts
- src/lib/validations/user.ts (separate create + update schemas)

SERVER ACTIONS:
- src/server/admin-brand-actions.ts — create/update/archive/restore
- src/server/admin-category-actions.ts — create/update/archive/restore
- src/server/admin-user-actions.ts — create/update/deactivate/reactivate/
  triggerPasswordReset (all admin-only via requireAdmin)
- New user creation auto-sends password reset email via Resend
- Deactivate user also deletes all their sessions (force logout)

AUTH HELPERS:
- src/lib/auth-helpers.ts — getSessionUser / requireSession / requireAdmin
- Centralizes role lookup with role-based access control

ADMIN UI:
- /admin/brands — list with state filter, brand cards
- /admin/brands/new + /admin/brands/[id]/edit — bilingual form with 
  logo + hero image upload
- /admin/categories — list with state filter
- /admin/categories/new + /admin/categories/[id]/edit — bilingual form 
  with hero image upload
- /admin/users — list (admin-only access)
- /admin/users/new + /admin/users/[id]/edit — admin-only forms
- Self-demotion prevention (can't remove own admin role)
- Self-deactivation prevention (can't deactivate self)

IMAGE PROCESSING:
- New 'logo' variant: 600×600, fit: contain, transparent background
- sharp pipeline supports contain + background fill for logos
- ImageUpload accepts 'logo' variant with aspect-square preview

PUBLIC SITE UPDATES (archived excluded):
- src/server/queries.ts — all brand/category queries filter 
  isNull(archivedAt)
- src/app/sitemap.ts — archived brands/categories omitted

OUT OF SCOPE:
- CSV import (Phase 7f)
- Admin polish: keyboard shortcuts, cmd+k (Phase 7g)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (after both checkpoints + final)
- [ ] pnpm build succeeds
- [ ] Schema changes applied (brands + categories + users)
- [ ] Brand CRUD pages exist (/admin/brands/*)
- [ ] Category CRUD pages exist (/admin/categories/*)
- [ ] User CRUD pages exist (/admin/users/*)
- [ ] requireAdmin enforced on user routes
- [ ] Logo variant supported in image-processing
- [ ] Public queries exclude archived brands/categories
- [ ] Sitemap excludes archived
- [ ] All public regression routes return 200
- [ ] All admin routes redirect 307
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary per CRUD area)
2. Files modified (especially public queries that got archivedAt filter)
3. Build verification outputs
4. Smoke test results (admin redirects + public 200s)
5. Schema state confirmation
6. Any deviations
7. Final commit hash

================================================================
DO NOT
================================================================

- Build CSV import (Phase 7f)
- Add keyboard shortcuts (Phase 7g)
- Build user profile picture upload
- Add 2FA flows
- Build the actual /reset-password page UI (Phase 6 already did this)
- Modify v2 brand spec
- Modify customer-facing brand/category landing UI
- Add new dependencies beyond what's installed

================================================================
FAILURE MODES TO WATCH
================================================================

- If schema columns conflict with existing ones: audit the current 
  schema carefully. brands and categories may already have some of 
  the columns being added. Only add what's missing.

- If auth.api.signUpEmail fails on user creation: check that 
  emailAndPassword is enabled in src/lib/auth.ts (Phase 6) AND that 
  the database has the accounts table. The user creation calls into 
  better-auth's normal signup flow.

- If requireAdmin in src/lib/auth-helpers.ts has circular import 
  with src/server/admin-product-actions.ts: refactor to import the 
  helpers from one direction only. The auth-helpers file should not 
  import from server/* — only from db/, lib/auth, etc.

- If the password reset email after user creation doesn't fire: in 
  dev without Resend env vars, the resend client is null and the 
  email send silently fails. This is expected — emails will work in 
  production. The user creation itself should still succeed (we 
  .catch the email error).

- If self-demotion check fails to compare IDs: ensure `admin.id` from 
  requireAdmin returns the session user's ID. The helper returns the 
  full user object including id.

- If "Cannot deactivate yourself" doesn't trigger: the admin object 
  from requireAdmin has the current user's id. Compare exactly: 
  admin.id === userId.

- If users.deactivatedAt column already existed (unlikely): the push 
  --force will report no-op for that column. Fine.

- If image-processing variant type breaks Phase 7d's ImageUpload: the 
  type extension is purely additive ('logo' is a new union member). 
  Existing code using 'card' | 'hero' | 'carousel' continues to work.

- If logo's fit: contain shows letterboxing on portrait or landscape 
  brand logos: that's expected. Logos rarely fit 1:1. The contain 
  fit with transparent background is the right call — square logos 
  fill, off-square logos letterbox cleanly.

- If sitemap.ts errors on missing archivedAt query: the sitemap fetches 
  brands and categories; add the isNull(archivedAt) filter.