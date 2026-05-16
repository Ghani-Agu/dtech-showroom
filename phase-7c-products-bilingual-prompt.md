You are executing Phase 7c — Products CRUD (Bilingual) for the Dtech 
Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7b complete (latest commit: 051d748): inquiry management 
  fully functional
- v2 brand spec is source of truth for visual decisions
- Architecture LOCKED:
  - Translation strategy: _fr columns on existing tables (Option A)
  - Image storage: Cloudflare R2 (Phase 7d will integrate; 7c builds 
    placeholder UI)
  - Bilingual UX: side-by-side EN + FR editors in same form
- Phase 7a UI primitives ready: Card, Button, Input, Textarea, Badge, 
  Stat
- Sonner toast system live in admin layout
- This is Phase 7c of 7

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Build the complete product management interface for Dtech employees. 
Add bilingual columns to the products table (name_fr, tagline_fr, 
description_fr, card_spec_fr, search_keywords_fr) and an archivedAt 
timestamp for soft-delete pattern. Build /admin/products list view 
with filtering by brand/category/tier/featured/archived status, 
search, sort, and pagination. Build /admin/products/new and 
/admin/products/[id]/edit pages sharing a ProductForm component with 
side-by-side EN+FR field pairs, brand/category/tier selectors, 
featured toggle, sortOrder input, specs JSON editor, and SEO fields. 
Build server actions for create/update/archive/restore with Zod 
validation. Update the customer-facing product detail page query to 
exclude archived products. Image upload integration is a placeholder 
(real upload comes in Phase 7d).

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Real image upload to Cloudflare R2 (Phase 7d) — placeholder UI only
- Brand/category management UI (Phase 7e)
- User management (Phase 7e)
- CSV import (Phase 7f)
- Keyboard shortcuts / cmd+k (Phase 7g)
- French translations of admin UI labels themselves (Phase 8 — admin 
  UI stays English-only; only product CONTENT is bilingual)
- Locale routing on customer-facing site (Phase 8)
- Modifying customer-facing inquiry form
- Modifying auth flow
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Modifying v2 brand spec
- Touching /motion or any (dev) routes
- Real product image URLs in the form — text input for path/URL only 
  in this phase

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Schema additions (bilingual columns + archivedAt + indexes)
  2. Migration (db:push --force, additive only)
  3. Zod validation schemas
  4. Server actions (create/update/archive/restore product)
  5. Product list page with filters/search/pagination
  6. ProductListRow component
  7. New product page (/admin/products/new)
  8. Edit product page (/admin/products/[id]/edit)
  9. ProductForm shared component (bilingual)
  10. BilingualField helper component (EN | FR side-by-side)
  11. SpecsEditor component (JSONB structured editor)
  12. Update public product query to exclude archived
  13. Verification (lint, tsc, build, smoke tests)
  14. Commit

tsc checkpoint after task 4, task 9, and task 12.

================================================================
TASK 1 — SCHEMA ADDITIONS
================================================================

Open src/db/schema.ts. Find the existing products pgTable definition. 
Add new columns (do NOT modify or remove existing columns).

Add these columns to products table:

```typescript
// =========================================================================
// BILINGUAL CONTENT (Phase 7c — EN is canonical, FR is translation)
// =========================================================================
nameFr: text('name_fr'),                       // nullable until translated
taglineFr: text('tagline_fr'),
descriptionFr: text('description_fr'),
cardSpecFr: text('card_spec_fr'),
searchKeywordsFr: text('search_keywords_fr'),

// =========================================================================
// SOFT DELETE (Phase 7c)
// =========================================================================
archivedAt: timestamp('archived_at'),  // null = active, set = archived
```

Important notes:
- `nullable: true` is the default for text/timestamp columns in 
  Drizzle's PG schema. The FR columns being null means "not yet 
  translated" and the customer-facing site falls back to the EN field.
- `archivedAt` is the soft-delete pattern. Customer-facing queries 
  must filter `WHERE archived_at IS NULL`. Admin queries see all by 
  default, filterable.

Add an index on archived_at for query performance:

```typescript
// In the products pgTable definition's third arg (the function that 
// returns indexes), add:
archivedAtIdx: index('products_archived_at_idx').on(table.archivedAt),
```

If the products table doesn't currently have an index callback (third 
argument to pgTable), add one. The signature is:

```typescript
export const products = pgTable('products', {
  // ... columns
}, (table) => ({
  // ... existing indexes if any
  archivedAtIdx: index('products_archived_at_idx').on(table.archivedAt),
}))
```

================================================================
TASK 2 — APPLY MIGRATION
================================================================

Run:
  pnpm db:push --force

Additive only (6 new columns + 1 index, zero modifications to 
existing columns). --force is safe.

Verify:
  pnpm db:studio

Confirm in products table:
- name_fr, tagline_fr, description_fr, card_spec_fr, search_keywords_fr 
  columns (all nullable text)
- archived_at column (nullable timestamp)
- products_archived_at_idx index

================================================================
TASK 3 — ZOD VALIDATION SCHEMAS
================================================================

Create src/lib/validations/product.ts:

```typescript
import { z } from 'zod'

// Slug: lowercase, alphanumeric, hyphens only
const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only, no special characters',
  })

// Tier enum (matches schema)
const tierSchema = z.enum(['hero', 'featured', 'longtail'])

// Specs: flexible JSONB — Record<string, string | number | string[]>
// Validated as an object with string keys; admin enters via UI
const specsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.array(z.string())])
).default({})

export const productFormSchema = z.object({
  // Identity
  slug: slugSchema,
  
  // English content (canonical, required)
  name: z.string().min(2).max(200),
  tagline: z.string().max(200).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  cardSpec: z.string().max(120).optional().default(''),
  searchKeywords: z.string().max(500).optional().default(''),
  
  // French content (translation, optional)
  nameFr: z.string().max(200).optional().default(''),
  taglineFr: z.string().max(200).optional().default(''),
  descriptionFr: z.string().max(5000).optional().default(''),
  cardSpecFr: z.string().max(120).optional().default(''),
  searchKeywordsFr: z.string().max(500).optional().default(''),
  
  // Classification
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  tier: tierSchema,
  
  // Display
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(100),
  
  // Specs (JSONB)
  specs: specsSchema,
  
  // Image paths (text for now — Phase 7d will upload via R2)
  cardImagePath: z.string().max(500).optional().default(''),
  heroImagePath: z.string().max(500).optional().default(''),
  glbModelPath: z.string().max(500).optional().default(''),
  photoCarouselPaths: z.array(z.string().max(500)).max(8).default([]),
  
  // SEO
  seoTitle: z.string().max(120).optional().default(''),
  seoDescription: z.string().max(300).optional().default(''),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
```

If your existing products schema uses different field names (e.g., 
sortOrder might already exist; verify against current schema), align 
to the existing naming.

================================================================
TASK 4 — SERVER ACTIONS
================================================================

Create src/server/admin-product-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { products } from '@/db/schema'
import { auth } from '@/lib/auth'
import { productFormSchema, type ProductFormValues } from '@/lib/validations/product'

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session.user
}

export async function createProduct(values: ProductFormValues) {
  await requireSession()
  
  // Validate
  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) {
    return { 
      ok: false, 
      errors: parsed.error.flatten().fieldErrors,
    } as const
  }
  
  // Check slug uniqueness
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])
  
  if (existing) {
    return {
      ok: false,
      errors: { slug: ['A product with this slug already exists'] },
    } as const
  }
  
  // Insert
  const inserted = await db
    .insert(products)
    .values({
      ...parsed.data,
      // Normalize empty strings to null for nullable FR columns
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
    })
    .returning({ id: products.id })
  
  const newId = inserted[0]?.id
  
  revalidatePath('/admin/products')
  revalidatePath('/admin')  // dashboard count
  revalidatePath('/')        // homepage featured products may include this
  revalidatePath('/brands')  // brand pages
  revalidatePath('/categories')
  
  if (!newId) {
    return { ok: false, errors: { _form: ['Failed to create product'] } } as const
  }
  
  return { ok: true, id: newId } as const
}

export async function updateProduct(productId: string, values: ProductFormValues) {
  await requireSession()
  
  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    } as const
  }
  
  // Check slug uniqueness (excluding self)
  const slugTaken = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, parsed.data.slug))
    .limit(1)
    .then((rows) => rows[0])
  
  if (slugTaken && slugTaken.id !== productId) {
    return {
      ok: false,
      errors: { slug: ['A product with this slug already exists'] },
    } as const
  }
  
  await db
    .update(products)
    .set({
      ...parsed.data,
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
  
  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  revalidatePath(`/products/${parsed.data.slug}`)
  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/categories')
  
  return { ok: true, id: productId } as const
}

export async function archiveProduct(productId: string) {
  await requireSession()
  
  const product = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!product) {
    return { ok: false, error: 'Product not found' } as const
  }
  
  await db
    .update(products)
    .set({ archivedAt: new Date() })
    .where(eq(products.id, productId))
  
  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath(`/products/${product.slug}`)
  revalidatePath('/')
  revalidatePath('/brands')
  revalidatePath('/categories')
  
  return { ok: true } as const
}

export async function restoreProduct(productId: string) {
  await requireSession()
  
  await db
    .update(products)
    .set({ archivedAt: null })
    .where(eq(products.id, productId))
  
  revalidatePath('/admin/products')
  revalidatePath('/admin')
  
  return { ok: true } as const
}
```

================================================================
TASK 5 — PRODUCT LIST PAGE
================================================================

Replace src/app/admin/products/page.tsx with the full list view:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db/client'
import { products, brands, categories } from '@/db/schema'
import { eq, ilike, or, and, desc, asc, count, isNull, isNotNull } from 'drizzle-orm'
import { Input } from '@/components/admin/ui/Input'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { ProductListRow } from '@/components/admin/products/ProductListRow'
import { CircleDashed, Plus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Products — Dtech Admin',
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 25

type FilterState = 'active' | 'archived' | 'all'
type TierFilter = 'all' | 'hero' | 'featured' | 'longtail'

interface PageProps {
  searchParams: Promise<{
    state?: FilterState
    tier?: TierFilter
    brand?: string
    category?: string
    q?: string
    page?: string
  }>
}

function validateState(s?: string): FilterState {
  return s === 'archived' || s === 'all' ? s : 'active'
}

function validateTier(t?: string): TierFilter {
  return t === 'hero' || t === 'featured' || t === 'longtail' ? t : 'all'
}

async function getProducts(
  state: FilterState,
  tier: TierFilter,
  brandSlug: string,
  categorySlug: string,
  query: string,
  page: number,
) {
  const offset = (page - 1) * PAGE_SIZE
  
  const conditions = []
  
  if (state === 'active') conditions.push(isNull(products.archivedAt))
  if (state === 'archived') conditions.push(isNotNull(products.archivedAt))
  
  if (tier !== 'all') conditions.push(eq(products.tier, tier))
  
  if (brandSlug) {
    const brand = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, brandSlug))
      .limit(1)
      .then((rows) => rows[0])
    
    if (brand) conditions.push(eq(products.brandId, brand.id))
  }
  
  if (categorySlug) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1)
      .then((rows) => rows[0])
    
    if (category) conditions.push(eq(products.categoryId, category.id))
  }
  
  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.slug, pattern),
        ilike(products.tagline, pattern),
        ilike(products.searchKeywords, pattern),
        ilike(products.nameFr, pattern),
      )!
    )
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        nameFr: products.nameFr,
        tier: products.tier,
        featured: products.featured,
        sortOrder: products.sortOrder,
        cardImagePath: products.cardImagePath,
        archivedAt: products.archivedAt,
        brandName: brands.name,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(asc(products.sortOrder), asc(products.name))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: count() })
      .from(products)
      .where(whereClause),
  ])
  
  return {
    rows,
    total: totalRow[0]?.count ?? 0,
  }
}

async function getFilterOptions() {
  const [brandList, categoryList] = await Promise.all([
    db.select({ slug: brands.slug, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ])
  
  return { brands: brandList, categories: categoryList }
}

function buildHref(params: Partial<Record<string, string>>) {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value)
  }
  const str = sp.toString()
  return '/admin/products' + (str ? `?${str}` : '')
}

export default async function ProductsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)
  const tier = validateTier(params.tier)
  const brandSlug = params.brand ?? ''
  const categorySlug = params.category ?? ''
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  
  const [{ rows, total }, filterOptions] = await Promise.all([
    getProducts(state, tier, brandSlug, categorySlug, query, page),
    getFilterOptions(),
  ])
  
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  
  const tierFilters: Array<{ value: TierFilter; label: string }> = [
    { value: 'all', label: 'All tiers' },
    { value: 'hero', label: 'Hero' },
    { value: 'featured', label: 'Featured' },
    { value: 'longtail', label: 'Long-tail' },
  ]
  
  const stateFilters: Array<{ value: FilterState; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Products
          </p>
          <h1 className="font-display text-3xl text-text-primary tracking-tight">
            Catalog<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/products/new">
          <Button variant="primary">
            <Plus size={16} />
            New product
          </Button>
        </Link>
      </div>
      
      {/* Filters */}
      <div className="space-y-3">
        {/* State + Tier tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            State:
          </span>
          {stateFilters.map((f) => {
            const isActive = state === f.value
            return (
              <Link
                key={f.value}
                href={buildHref({
                  state: f.value === 'active' ? undefined : f.value,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                })}
                className={
                  isActive
                    ? 'inline-flex items-center px-2.5 py-1 rounded-full bg-surface-overlay text-text-primary font-body text-xs font-medium'
                    : 'inline-flex items-center px-2.5 py-1 rounded-full text-text-secondary hover:text-text-primary font-body text-xs transition-colors'
                }
              >
                {f.label}
              </Link>
            )
          })}
          
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted ml-4">
            Tier:
          </span>
          {tierFilters.map((f) => {
            const isActive = tier === f.value
            return (
              <Link
                key={f.value}
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: f.value === 'all' ? undefined : f.value,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                })}
                className={
                  isActive
                    ? 'inline-flex items-center px-2.5 py-1 rounded-full bg-surface-overlay text-text-primary font-body text-xs font-medium'
                    : 'inline-flex items-center px-2.5 py-1 rounded-full text-text-secondary hover:text-text-primary font-body text-xs transition-colors'
                }
              >
                {f.label}
              </Link>
            )
          })}
        </div>
        
        {/* Brand + Category + Search row */}
        <form action="/admin/products" method="GET" className="flex flex-wrap items-end gap-3">
          {state !== 'active' && <input type="hidden" name="state" value={state} />}
          {tier !== 'all' && <input type="hidden" name="tier" value={tier} />}
          
          <div className="min-w-[180px]">
            <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-1.5">
              Brand
            </label>
            <select 
              name="brand" 
              defaultValue={brandSlug}
              className="w-full bg-surface-elevated px-3 py-2 font-body text-sm text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All brands</option>
              {filterOptions.brands.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[180px]">
            <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-1.5">
              Category
            </label>
            <select 
              name="category" 
              defaultValue={categorySlug}
              className="w-full bg-surface-elevated px-3 py-2 font-body text-sm text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[240px]">
            <Input
              type="search"
              name="q"
              label="Search"
              placeholder="Name, slug, tagline, keywords..."
              defaultValue={query}
            />
          </div>
          
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </div>
      
      {/* Results */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed size={40} className="mx-auto text-text-muted mb-4" />
            <p className="font-body text-base text-text-secondary">
              No products match the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((p) => (
              <ProductListRow key={p.id} product={p} />
            ))}
          </ul>
        </Card>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <p className="font-body text-sm text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                  page: String(page - 1),
                })}
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref({
                  state: state === 'active' ? undefined : state,
                  tier: tier === 'all' ? undefined : tier,
                  brand: brandSlug || undefined,
                  category: categorySlug || undefined,
                  q: query || undefined,
                  page: String(page + 1),
                })}
                className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
```

================================================================
TASK 6 — PRODUCT LIST ROW
================================================================

Create src/components/admin/products/ProductListRow.tsx:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/admin/ui/Badge'

interface ProductListRowProps {
  product: {
    id: string
    slug: string
    name: string
    nameFr: string | null
    tier: 'hero' | 'featured' | 'longtail'
    featured: boolean
    sortOrder: number
    cardImagePath: string | null
    archivedAt: Date | null
    brandName: string | null
    categoryName: string | null
  }
}

const tierLabel = {
  hero: 'Hero',
  featured: 'Featured',
  longtail: 'Long-tail',
}

const tierVariant = {
  hero: 'accent' as const,
  featured: 'neutral' as const,
  longtail: 'neutral' as const,
}

export function ProductListRow({ product }: ProductListRowProps) {
  const isArchived = product.archivedAt !== null
  const hasFrTranslation = product.nameFr !== null && product.nameFr.length > 0
  
  return (
    <li>
      <Link 
        href={`/admin/products/${product.id}/edit`}
        className={
          isArchived
            ? 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors opacity-60'
            : 'block px-6 py-4 hover:bg-surface-overlay/40 transition-colors'
        }
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded bg-surface-elevated flex-shrink-0 overflow-hidden">
            {product.cardImagePath && (
              <Image
                src={product.cardImagePath}
                alt=""
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body text-base font-medium text-text-primary truncate">
                {product.name}
              </p>
              <Badge variant={tierVariant[product.tier]}>
                {tierLabel[product.tier]}
              </Badge>
              {product.featured && (
                <Badge variant="accent">Featured</Badge>
              )}
              {!hasFrTranslation && (
                <Badge variant="warning">EN only</Badge>
              )}
              {isArchived && (
                <Badge variant="neutral">Archived</Badge>
              )}
            </div>
            <p className="font-body text-sm text-text-secondary mt-1 truncate">
              {product.brandName} · {product.categoryName} · /{product.slug}
            </p>
          </div>
          
          {/* Sort order */}
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-xs text-text-muted">
              Sort
            </p>
            <p className="font-mono text-sm text-text-secondary">
              {product.sortOrder}
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}
```

================================================================
TASK 7 — NEW PRODUCT PAGE
================================================================

Create src/app/admin/products/new/page.tsx:

```tsx
import type { Metadata } from 'next'
import { db } from '@/db/client'
import { brands, categories } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { ProductForm } from '@/components/admin/products/ProductForm'

export const metadata: Metadata = {
  title: 'New product — Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const [brandList, categoryList] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ])
  
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Products / New
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          New product<span className="text-accent">.</span>
        </h1>
      </div>
      
      <ProductForm 
        mode="create"
        brands={brandList}
        categories={categoryList}
      />
    </div>
  )
}
```

================================================================
TASK 8 — EDIT PRODUCT PAGE
================================================================

Create src/app/admin/products/[productId]/edit/page.tsx:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db/client'
import { products, brands, categories } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ProductForm } from '@/components/admin/products/ProductForm'
import { Badge } from '@/components/admin/ui/Badge'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ productId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params
  const product = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .then((rows) => rows[0])
  
  if (!product) return { title: 'Product not found' }
  
  return {
    title: `Edit ${product.name} — Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

export default async function EditProductPage({ params }: PageProps) {
  const { productId } = await params
  
  const [product, brandList, categoryList] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).limit(1).then((rows) => rows[0]),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ])
  
  if (!product) notFound()
  
  return (
    <div className="space-y-6 max-w-5xl">
      <Link 
        href="/admin/products"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        All products
      </Link>
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Products / Edit
          </p>
          <h1 className="font-display text-3xl text-text-primary tracking-tight">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="neutral">/{product.slug}</Badge>
            {product.archivedAt && <Badge variant="warning">Archived</Badge>}
          </div>
        </div>
      </div>
      
      <ProductForm 
        mode="edit"
        productId={product.id}
        initialValues={{
          slug: product.slug,
          name: product.name,
          tagline: product.tagline ?? '',
          description: product.description ?? '',
          cardSpec: product.cardSpec ?? '',
          searchKeywords: product.searchKeywords ?? '',
          nameFr: product.nameFr ?? '',
          taglineFr: product.taglineFr ?? '',
          descriptionFr: product.descriptionFr ?? '',
          cardSpecFr: product.cardSpecFr ?? '',
          searchKeywordsFr: product.searchKeywordsFr ?? '',
          brandId: product.brandId,
          categoryId: product.categoryId,
          tier: product.tier,
          featured: product.featured,
          sortOrder: product.sortOrder,
          specs: (product.specs as Record<string, string | number | string[]>) ?? {},
          cardImagePath: product.cardImagePath ?? '',
          heroImagePath: product.heroImagePath ?? '',
          glbModelPath: product.glbModelPath ?? '',
          photoCarouselPaths: (product.photoCarouselPaths as string[]) ?? [],
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
        }}
        isArchived={product.archivedAt !== null}
        brands={brandList}
        categories={categoryList}
      />
    </div>
  )
}
```

================================================================
TASK 9 — PRODUCT FORM (BILINGUAL)
================================================================

Create src/components/admin/products/ProductForm.tsx:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/admin/ui/Input'
import { Textarea } from '@/components/admin/ui/Textarea'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'
import { BilingualField } from './BilingualField'
import { SpecsEditor } from './SpecsEditor'
import { 
  createProduct, 
  updateProduct, 
  archiveProduct, 
  restoreProduct,
} from '@/server/admin-product-actions'
import { toast } from '@/lib/toast'
import type { ProductFormValues } from '@/lib/validations/product'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  initialValues?: ProductFormValues
  isArchived?: boolean
  brands: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
}

const defaultValues: ProductFormValues = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  cardSpec: '',
  searchKeywords: '',
  nameFr: '',
  taglineFr: '',
  descriptionFr: '',
  cardSpecFr: '',
  searchKeywordsFr: '',
  brandId: '',
  categoryId: '',
  tier: 'longtail',
  featured: false,
  sortOrder: 100,
  specs: {},
  cardImagePath: '',
  heroImagePath: '',
  glbModelPath: '',
  photoCarouselPaths: [],
  seoTitle: '',
  seoDescription: '',
}

export function ProductForm({
  mode,
  productId,
  initialValues,
  isArchived = false,
  brands,
  categories,
}: ProductFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? defaultValues)
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [isPending, startTransition] = useTransition()
  
  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: undefined }))
    }
  }
  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    
    startTransition(async () => {
      const result = mode === 'create'
        ? await createProduct(values)
        : await updateProduct(productId!, values)
      
      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Please fix the errors below.')
        return
      }
      
      toast.success(mode === 'create' ? 'Product created' : 'Product updated')
      
      if (mode === 'create' && 'id' in result) {
        router.push(`/admin/products/${result.id}/edit`)
      } else {
        router.refresh()
      }
    })
  }
  
  function handleArchive() {
    if (!productId) return
    if (!confirm('Archive this product? It will be hidden from the catalog but kept in the database.')) return
    
    startTransition(async () => {
      const result = await archiveProduct(productId)
      if (result.ok) {
        toast.success('Product archived')
        router.refresh()
      } else {
        toast.error('Failed to archive')
      }
    })
  }
  
  function handleRestore() {
    if (!productId) return
    
    startTransition(async () => {
      const result = await restoreProduct(productId)
      if (result.ok) {
        toast.success('Product restored')
        router.refresh()
      } else {
        toast.error('Failed to restore')
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            URL slug and English name. These define how the product is found.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="URL slug"
            description="Lowercase, hyphens only. Example: hp-omen-16-i9-rtx-4070"
            value={values.slug}
            onChange={(e) => update('slug', e.target.value)}
            error={errors.slug?.[0]}
            required
          />
        </CardContent>
      </Card>
      
      {/* Bilingual content */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            English is the canonical version (required). French is optional — when 
            empty, the public site falls back to English.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            label="Name"
            description="The product name as shown on cards and headings."
            required
            enValue={values.name}
            frValue={values.nameFr}
            onEnChange={(v) => update('name', v)}
            onFrChange={(v) => update('nameFr', v)}
            enError={errors.name?.[0]}
            frError={errors.nameFr?.[0]}
            type="input"
          />
          
          <BilingualField
            label="Tagline"
            description="Short, evocative phrase shown beneath the name."
            enValue={values.tagline}
            frValue={values.taglineFr}
            onEnChange={(v) => update('tagline', v)}
            onFrChange={(v) => update('taglineFr', v)}
            type="input"
          />
          
          <BilingualField
            label="Card spec"
            description="One-line spec summary shown on product cards. E.g. Intel i9-13900HX · 32GB"
            enValue={values.cardSpec}
            frValue={values.cardSpecFr}
            onEnChange={(v) => update('cardSpec', v)}
            onFrChange={(v) => update('cardSpecFr', v)}
            type="input"
          />
          
          <BilingualField
            label="Description"
            description="Full editorial description shown on the product detail page."
            enValue={values.description}
            frValue={values.descriptionFr}
            onEnChange={(v) => update('description', v)}
            onFrChange={(v) => update('descriptionFr', v)}
            type="textarea"
            rows={6}
          />
          
          <BilingualField
            label="Search keywords"
            description="Space-separated keywords for search matching. Not shown to customers."
            enValue={values.searchKeywords}
            frValue={values.searchKeywordsFr}
            onEnChange={(v) => update('searchKeywords', v)}
            onFrChange={(v) => update('searchKeywordsFr', v)}
            type="input"
          />
        </CardContent>
      </Card>
      
      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Brand
            </label>
            <select
              value={values.brandId}
              onChange={(e) => update('brandId', e.target.value)}
              required
              className="w-full bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select brand...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.brandId && (
              <p className="font-body text-sm text-semantic-error">{errors.brandId[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Category
            </label>
            <select
              value={values.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              required
              className="w-full bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="font-body text-sm text-semantic-error">{errors.categoryId[0]}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Presentation tier
            </label>
            <select
              value={values.tier}
              onChange={(e) => update('tier', e.target.value as 'hero' | 'featured' | 'longtail')}
              required
              className="w-full bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="hero">Hero — cinematic stage</option>
              <option value="featured">Featured — functional viewer</option>
              <option value="longtail">Long-tail — photo carousel</option>
            </select>
          </div>
        </CardContent>
      </Card>
      
      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => update('featured', e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="font-body text-sm text-text-primary">
              Featured on homepage
            </span>
          </label>
          
          <Input
            label="Sort order"
            description="Lower numbers appear first. Default 100."
            type="number"
            min={0}
            max={9999}
            value={values.sortOrder}
            onChange={(e) => update('sortOrder', parseInt(e.target.value, 10) || 0)}
          />
        </CardContent>
      </Card>
      
      {/* Specs */}
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
          <CardDescription>
            Technical specs rendered as a table on the product detail page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpecsEditor
            value={values.specs}
            onChange={(specs) => update('specs', specs)}
          />
        </CardContent>
      </Card>
      
      {/* Images (placeholder until Phase 7d) */}
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Image paths. Real drag-drop upload to Cloudflare R2 comes in Phase 7d. 
            For now, enter paths manually (e.g., /images/products/[slug]/card.webp).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Card image path"
            description="800×600, used in product grid cards."
            value={values.cardImagePath}
            onChange={(e) => update('cardImagePath', e.target.value)}
            placeholder="/images/products/your-slug/card.webp"
          />
          <Input
            label="Hero image path"
            description="2400×1350, used in product detail stage."
            value={values.heroImagePath}
            onChange={(e) => update('heroImagePath', e.target.value)}
            placeholder="/images/products/your-slug/hero.webp"
          />
        </CardContent>
      </Card>
      
      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>
            Override defaults for meta title and description. Leave blank to use 
            name and tagline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="SEO title"
            description="Max 120 chars. Defaults to product name."
            value={values.seoTitle}
            onChange={(e) => update('seoTitle', e.target.value)}
          />
          <Textarea
            label="SEO description"
            description="Max 300 chars. Defaults to tagline."
            rows={2}
            value={values.seoDescription}
            onChange={(e) => update('seoDescription', e.target.value)}
          />
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-surface-base py-4 border-t border-surface-overlay">
        <div>
          {mode === 'edit' && !isArchived && (
            <Button type="button" variant="destructive" onClick={handleArchive} disabled={isPending}>
              Archive product
            </Button>
          )}
          {mode === 'edit' && isArchived && (
            <Button type="button" variant="secondary" onClick={handleRestore} disabled={isPending}>
              Restore product
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {mode === 'create' ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
```

================================================================
TASK 10 — BILINGUAL FIELD HELPER
================================================================

Create src/components/admin/products/BilingualField.tsx:

```tsx
import { Input } from '@/components/admin/ui/Input'
import { Textarea } from '@/components/admin/ui/Textarea'

interface BilingualFieldProps {
  label: string
  description?: string
  required?: boolean
  type: 'input' | 'textarea'
  rows?: number
  
  enValue: string
  frValue: string
  
  onEnChange: (value: string) => void
  onFrChange: (value: string) => void
  
  enError?: string
  frError?: string
}

export function BilingualField({
  label,
  description,
  required,
  type,
  rows,
  enValue,
  frValue,
  onEnChange,
  onFrChange,
  enError,
  frError,
}: BilingualFieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block font-body text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </label>
        {description && (
          <p className="font-body text-xs text-text-muted mt-1">{description}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            English {required && <span className="text-accent">(required)</span>}
          </p>
          {type === 'input' ? (
            <Input
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
            />
          ) : (
            <Textarea
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
              rows={rows}
            />
          )}
        </div>
        
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Français <span className="text-text-muted">(optional)</span>
          </p>
          {type === 'input' ? (
            <Input
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              placeholder={enValue ? `(falls back to: ${enValue.slice(0, 40)}...)` : ''}
            />
          ) : (
            <Textarea
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              rows={rows}
              placeholder={enValue ? '(falls back to English when empty)' : ''}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

================================================================
TASK 11 — SPECS EDITOR
================================================================

Create src/components/admin/products/SpecsEditor.tsx:

```tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/admin/ui/Input'
import { Button } from '@/components/admin/ui/Button'
import { X, Plus } from 'lucide-react'

type SpecValue = string | number | string[]

interface SpecsEditorProps {
  value: Record<string, SpecValue>
  onChange: (value: Record<string, SpecValue>) => void
}

export function SpecsEditor({ value, onChange }: SpecsEditorProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  
  const entries = Object.entries(value)
  
  function addSpec() {
    if (!newKey.trim() || !newValue.trim()) return
    onChange({ ...value, [newKey.trim()]: newValue.trim() })
    setNewKey('')
    setNewValue('')
  }
  
  function updateSpec(key: string, newVal: string) {
    onChange({ ...value, [key]: newVal })
  }
  
  function removeSpec(key: string) {
    const copy = { ...value }
    delete copy[key]
    onChange(copy)
  }
  
  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map(([key, val]) => (
            <li key={key} className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-surface-elevated px-3 py-2 rounded-md font-mono text-sm text-text-secondary">
                  {key}
                </div>
                <input
                  type="text"
                  value={typeof val === 'string' ? val : JSON.stringify(val)}
                  onChange={(e) => updateSpec(key, e.target.value)}
                  className="bg-surface-elevated px-3 py-2 rounded-md font-body text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSpec(key)}
                className="p-2 text-text-muted hover:text-semantic-error transition-colors"
                aria-label={`Remove ${key}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      
      <div className="flex items-center gap-2 pt-3 border-t border-surface-overlay">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            placeholder="Spec name (e.g., CPU)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <Input
            placeholder="Value (e.g., Intel i9-13900HX)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSpec()
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={addSpec} disabled={!newKey || !newValue}>
          <Plus size={14} />
          Add
        </Button>
      </div>
      
      {entries.length === 0 && (
        <p className="font-body text-sm text-text-muted">
          No specs yet. Add the first spec above.
        </p>
      )}
    </div>
  )
}
```

================================================================
TASK 12 — EXCLUDE ARCHIVED FROM PUBLIC QUERIES
================================================================

Audit the customer-facing queries that fetch products. Find and 
update each to filter out archived products.

Files to audit (search for these patterns):

1. `src/lib/queries/` or `src/server/` — any function that queries 
   products for the public site
2. `src/app/page.tsx` (homepage featured products)
3. `src/app/products/[productSlug]/page.tsx` (product detail page)
4. `src/app/brands/[brandSlug]/page.tsx` (brand landing page products)
5. `src/app/categories/[categorySlug]/page.tsx` (category landing 
   page products)
6. `src/app/search/page.tsx` (search results)
7. `src/lib/queries/products.ts` if it exists

For each, add `isNull(products.archivedAt)` to the WHERE clause:

Example pattern — before:
```typescript
const featured = await db
  .select()
  .from(products)
  .where(eq(products.featured, true))
  .orderBy(asc(products.sortOrder))
```

After:
```typescript
const featured = await db
  .select()
  .from(products)
  .where(and(eq(products.featured, true), isNull(products.archivedAt)))
  .orderBy(asc(products.sortOrder))
```

For the product detail page query (single product by slug), if 
archived: return 404.

Example:
```typescript
const product = await db
  .select()
  .from(products)
  .where(and(eq(products.slug, slug), isNull(products.archivedAt)))
  .limit(1)
  .then((rows) => rows[0])

if (!product) notFound()
```

Important: admin queries (the ones in /admin/products/page.tsx that 
we just wrote) explicitly include archived products with state filter. 
The exclusion is only for customer-facing queries.

Run a search:
  grep -rn "from(products)" src/ --include="*.tsx" --include="*.ts" | grep -v "admin/" | grep -v "server/admin"

Then update each match accordingly.

================================================================
TASK 13 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test admin product routes (all redirect to /login):

  $adminRoutes = @(
    '/admin/products',
    '/admin/products?state=archived',
    '/admin/products?tier=hero',
    '/admin/products?brand=hp',
    '/admin/products?q=omen',
    '/admin/products/new'
  )
  foreach ($r in $adminRoutes) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
      Write-Host "Status: $($res.StatusCode) $r"
    } catch {
      Write-Host "Redirect 307 $r"
    }
  }

Regression smoke tests on customer-facing routes:

  $existing = @(
    '/', 
    '/brands', 
    '/brands/hp',
    '/categories', 
    '/categories/laptops',
    '/products/hp-omen-16-i9-rtx-4070', 
    '/search?q=omen',
    '/about'
  )
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All public routes must return 200. Admin all 307 redirects.

Database state check via db:studio:
- products table has 6 new columns
- products_archived_at_idx exists

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 14 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7c — products CRUD with bilingual fields

SCHEMA:
- products.name_fr, tagline_fr, description_fr, card_spec_fr, 
  search_keywords_fr (nullable, FR translations)
- products.archived_at (nullable timestamp, soft delete pattern)
- products_archived_at_idx index

VALIDATION:
- src/lib/validations/product.ts — Zod schema with slug regex, 
  tier enum, specs as Record<string, string|number|string[]>

SERVER ACTIONS (src/server/admin-product-actions.ts):
- createProduct — Zod validation, slug uniqueness check, insert
- updateProduct — same validations, excludes self in slug check
- archiveProduct — sets archivedAt, hides from public site
- restoreProduct — clears archivedAt
- All require session, revalidate affected paths

ADMIN UI:
- /admin/products — list with state/tier/brand/category filters, 
  search, pagination
- /admin/products/new — create form
- /admin/products/[id]/edit — edit form, archive/restore actions
- ProductListRow — shared list display with badges (tier, featured, 
  EN-only, archived)
- ProductForm — single shared form for create/edit modes
- BilingualField — side-by-side EN | FR editors with optional 
  FR fallback indication
- SpecsEditor — JSONB key/value editor with inline add/remove

PUBLIC SITE UPDATES:
- All customer-facing product queries now filter 
  WHERE archived_at IS NULL
- Product detail page returns 404 for archived products

OUT OF SCOPE (Phase 7d+):
- Real image upload to Cloudflare R2 (Phase 7d)
- Brand/category management UI (Phase 7e)
- CSV import (Phase 7f)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] 6 new columns + 1 index in products table
- [ ] /admin/products renders list (when authenticated)
- [ ] Filters work (state, tier, brand, category, search)
- [ ] /admin/products/new renders empty form
- [ ] /admin/products/[id]/edit renders pre-filled form
- [ ] Archived products excluded from public catalog
- [ ] Existing routes still return 200 (regression)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary) — especially which public 
   query files were updated to filter archivedAt
3. Build verification outputs
4. Admin route smoke tests
5. Regression smoke tests on customer-facing routes
6. Database state confirmation
7. Any deviations from spec
8. Final commit hash

================================================================
DO NOT
================================================================

- Build real image upload (Phase 7d with Cloudflare R2)
- Build brand/category/user management (Phase 7e)
- Add CSV import (Phase 7f)
- Modify v2 brand spec
- Modify auth flow
- Add new dependencies beyond what's already installed
- Touch /motion or (dev) routes

================================================================
FAILURE MODES TO WATCH
================================================================

- If existing products table already has nullable columns that 
  conflict with the new ones: read the current schema carefully 
  before adding. The new column names use snake_case in SQL but 
  camelCase in Drizzle TS. Check both.

- If specs JSONB type doesn't match Zod schema: the products table 
  may currently type specs as `jsonb('specs')` returning `unknown`. 
  The Zod schema treats it as Record. Cast at boundary if needed 
  (initialValues construction in EditProductPage).

- If photoCarouselPaths is stored as jsonb but Zod expects string[]: 
  same casting pattern. The .as() at retrieval time, JSON.stringify 
  at save time if needed.

- If form's select for brand/category doesn't pre-select on edit: 
  defaultValue / value must match the option's value exactly 
  (string UUID, not parsed). Use the existing brand.id / category.id 
  from the product.

- If revalidatePath calls don't refresh data: Next 16 may need 
  explicit tags. The basic revalidatePath should work for App Router 
  pages; if not, add `revalidatePath('/', 'layout')` for layout-level 
  refresh.

- If SpecsEditor loses data when typing: confirm onChange propagates 
  the FULL object (spread the old keys), not just the new one. The 
  pattern { ...value, [newKey]: newVal } is critical.

- If type errors on tier field: products.tier is a pgEnum. Drizzle 
  infers it as the union type. Confirm the form's tier field type 
  matches: 'hero' | 'featured' | 'longtail' (no other values).

- If BilingualField's grid doesn't stack on mobile: confirm Tailwind 
  v4 grid-cols-1 md:grid-cols-2 syntax. The md: prefix works in v4.

- If updating a product's slug while it's currently being viewed on 
  the public site causes 404s: this is expected — the slug changed, 
  the old URL no longer resolves. Phase 10 will add 301 redirects 
  for migrated slugs. For now, change slugs cautiously.

- If isNull/isNotNull import fails: they're from 'drizzle-orm', 
  same as eq, and, or.

- If you're tempted to add 'use server' to ProductForm: do NOT. The 
  form is a Client Component ('use client'), it imports server 
  actions, and Next.js handles the boundary automatically. Adding 
  'use server' would break it.

- If the admin sidebar 'Products' link doesn't highlight when on 
  /admin/products/new: that's an active-state matching issue in 
  AdminSidebar from Phase 7a. It should use startsWith('/admin/products') 
  for sub-routes. Confirm the existing implementation.