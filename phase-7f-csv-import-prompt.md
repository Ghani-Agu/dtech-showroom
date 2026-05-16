You are executing Phase 7f — CSV Import for the Dtech Showroom 
project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7e complete (latest commit: c69c21e): brand/category/user 
  management
- Established patterns from prior phases:
  - Zod validation in src/lib/validations/
  - Auth-guarded server actions
  - sonner toasts
  - Admin UI primitives (Card, Button, Input, Badge, Stat)
  - requireSession / requireAdmin from src/lib/auth-helpers.ts
- v2 brand spec is source of truth for visual decisions
- Real client engagement; Dtech explicitly requested CSV import
- This is Phase 7f of 7 (7g remains after this)

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Build a CSV/XLSX import flow for products at /admin/products/import. 
Three-step wizard: (1) upload file + parse preview, (2) map detected 
columns to product fields with smart auto-mapping, (3) validation 
report with per-row errors + commit confirmation. Uses 
papaparse for CSV and xlsx (SheetJS) for XLSX in browser. Server 
action validates and inserts each row via the same Zod schema as 
manual product creation, wrapped in a database transaction with 
all-or-nothing commit. Bilingual fields (English required, French 
optional) supported. Image URLs accepted as strings (links to 
externally-hosted images or R2 URLs from earlier uploads). After this 
lands, Dtech can bulk-import manufacturer spec sheets and add hundreds 
of products in minutes instead of hours.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- CSV import for brands, categories, or users (products only)
- CSV export (defer — Dtech can use db:studio or copy/paste if needed)
- Image upload from CSV (only image URLs; actual image upload via 
  Phase 7d ImageUpload remains the path for new images)
- Update-existing-products mode (only INSERT new; existing slugs 
  return validation error)
- Custom column transformations / formulas in the import (e.g., 
  computed fields)
- Resume-from-error mode (a partially failed import requires fixing 
  the CSV and re-running)
- Background job processing (synchronous import is fine for sizes 
  under 1000 rows)
- Email notifications on import completion
- Audit log for who imported what (defer — git history of inquiries 
  / product changes serves as audit for now)
- Customer-facing site changes
- Modifying v2 brand spec, brand-tokens.ts, fonts.ts
- Modifying auth flow
- Modifying Phase 7d image upload pipeline
- Adding new dependencies beyond papaparse + xlsx
- Touching /motion or any (dev) routes

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install dependencies (papaparse + xlsx + types)
  2. Build CSV/XLSX parser utility
  3. Build column auto-mapping heuristic
  4. Build validation utility (per-row + aggregate)
  5. Build bulk insert server action (transactional)
  6. Build /admin/products/import page (wizard shell)
  7. Build ImportUploadStep component (step 1)
  8. Build ImportMapStep component (step 2)
  9. Build ImportReviewStep component (step 3)
  10. Build sample CSV download (template for Dtech)
  11. Add "Import products" CTA on /admin/products page
  12. Verification (lint, tsc, build, smoke tests)
  13. Commit

tsc checkpoint after task 4 and task 9.

================================================================
TASK 1 — INSTALL DEPENDENCIES
================================================================

Run:
  pnpm add papaparse xlsx
  pnpm add -D @types/papaparse

Bundle impact note:
- papaparse: ~50KB gzipped, used in browser for CSV parsing
- xlsx (SheetJS): ~270KB gzipped — larger, used in browser for XLSX
- Both are client-side only; lazy-loaded via dynamic import on the 
  import page to avoid impacting other admin pages

Verify installation:
  pnpm list papaparse xlsx @types/papaparse

================================================================
TASK 2 — CSV/XLSX PARSER UTILITY
================================================================

Create src/lib/import/parse-file.ts:

```typescript
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParseResult {
  ok: true
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
} 

export interface ParseError {
  ok: false
  error: string
}

const MAX_ROWS = 1000
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB

/**
 * Detects file type from name and parses accordingly.
 * Returns headers + array of row objects (header → cell value).
 * All cell values are stringified for consistent downstream handling.
 */
export async function parseFile(file: File): Promise<ParseResult | ParseError> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }
  }
  
  const ext = file.name.toLowerCase().split('.').pop()
  
  if (ext === 'csv' || ext === 'tsv') {
    return parseCsv(file, ext === 'tsv' ? '\t' : ',')
  }
  
  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsx(file)
  }
  
  return { ok: false, error: 'Unsupported file format. Use CSV, TSV, XLS, or XLSX.' }
}

function parseCsv(file: File, delimiter: string): Promise<ParseResult | ParseError> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
      complete: (results) => {
        if (results.errors.length > 0) {
          const firstError = results.errors[0]
          resolve({ 
            ok: false, 
            error: `Parse error at row ${firstError.row}: ${firstError.message}`,
          })
          return
        }
        
        const headers = results.meta.fields ?? []
        const rows = results.data
        
        if (rows.length === 0) {
          resolve({ ok: false, error: 'No data rows found' })
          return
        }
        
        if (rows.length > MAX_ROWS) {
          resolve({ ok: false, error: `Too many rows (max ${MAX_ROWS}). Got ${rows.length}.` })
          return
        }
        
        resolve({ 
          ok: true, 
          headers, 
          rows: rows as Record<string, string>[],
          rowCount: rows.length,
        })
      },
      error: (err) => {
        resolve({ ok: false, error: err.message })
      },
    })
  })
}

async function parseXlsx(file: File): Promise<ParseResult | ParseError> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return { ok: false, error: 'No sheets found in workbook' }
    }
    
    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) {
      return { ok: false, error: 'Could not read first sheet' }
    }
    
    // Convert to JSON with headers from first row
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    })
    
    if (rawRows.length < 2) {
      return { ok: false, error: 'File has no data rows (only header or empty)' }
    }
    
    const headers = (rawRows[0] as unknown[]).map((h) => String(h).trim())
    const dataRows = rawRows.slice(1)
    
    if (dataRows.length > MAX_ROWS) {
      return { ok: false, error: `Too many rows (max ${MAX_ROWS}). Got ${dataRows.length}.` }
    }
    
    // Convert each row to header-keyed object
    const rows: Record<string, string>[] = dataRows.map((rowArray) => {
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        const arr = rowArray as unknown[]
        const cell = arr[i]
        row[header] = cell === null || cell === undefined ? '' : String(cell).trim()
      })
      return row
    })
    
    return {
      ok: true,
      headers,
      rows,
      rowCount: rows.length,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to parse XLSX',
    }
  }
}
```

================================================================
TASK 3 — COLUMN AUTO-MAPPING HEURISTIC
================================================================

Create src/lib/import/auto-map.ts:

```typescript
/**
 * The product fields that can be imported. Each maps to a key in 
 * the Zod productFormSchema.
 */
export const IMPORTABLE_FIELDS = {
  // Required
  slug: { label: 'URL Slug', required: true },
  name: { label: 'Name (English)', required: true },
  brandSlug: { label: 'Brand (slug)', required: true },
  categorySlug: { label: 'Category (slug)', required: true },
  tier: { label: 'Tier (hero | featured | longtail)', required: true },
  
  // Optional English
  tagline: { label: 'Tagline (English)', required: false },
  description: { label: 'Description (English)', required: false },
  cardSpec: { label: 'Card Spec (English)', required: false },
  searchKeywords: { label: 'Search Keywords (English)', required: false },
  
  // Optional French
  nameFr: { label: 'Name (French)', required: false },
  taglineFr: { label: 'Tagline (French)', required: false },
  descriptionFr: { label: 'Description (French)', required: false },
  cardSpecFr: { label: 'Card Spec (French)', required: false },
  searchKeywordsFr: { label: 'Search Keywords (French)', required: false },
  
  // Display
  featured: { label: 'Featured (true/false)', required: false },
  sortOrder: { label: 'Sort Order (number)', required: false },
  
  // Images (URLs)
  cardImagePath: { label: 'Card Image URL', required: false },
  heroImagePath: { label: 'Hero Image URL', required: false },
  
  // SEO
  seoTitle: { label: 'SEO Title', required: false },
  seoDescription: { label: 'SEO Description', required: false },
} as const

export type ImportableField = keyof typeof IMPORTABLE_FIELDS

/**
 * Common header name variations Dtech might use → field name.
 * Auto-mapping checks each CSV header against these patterns 
 * (case-insensitive, whitespace-normalized).
 */
const FIELD_ALIASES: Record<ImportableField, string[]> = {
  slug: ['slug', 'url slug', 'urlslug', 'product slug', 'url'],
  name: ['name', 'product name', 'name_en', 'name (en)', 'name (english)', 'english name', 'title'],
  brandSlug: ['brand', 'brand slug', 'brand_slug', 'manufacturer'],
  categorySlug: ['category', 'category slug', 'category_slug', 'product category'],
  tier: ['tier', 'presentation tier', 'priority'],
  
  tagline: ['tagline', 'subtitle', 'tagline_en', 'short description', 'tagline (en)'],
  description: ['description', 'description_en', 'long description', 'product description', 'description (en)'],
  cardSpec: ['card spec', 'card_spec', 'spec summary', 'short spec', 'cardspec'],
  searchKeywords: ['keywords', 'search keywords', 'search_keywords', 'tags', 'keywords_en'],
  
  nameFr: ['name_fr', 'name (fr)', 'name (french)', 'french name', 'nom', 'nom français'],
  taglineFr: ['tagline_fr', 'tagline (fr)', 'subtitle_fr', 'sous-titre'],
  descriptionFr: ['description_fr', 'description (fr)', 'description française'],
  cardSpecFr: ['card_spec_fr', 'card spec (fr)', 'spec_fr'],
  searchKeywordsFr: ['keywords_fr', 'search keywords (fr)', 'tags_fr'],
  
  featured: ['featured', 'is_featured', 'feature', 'highlighted'],
  sortOrder: ['sort', 'order', 'sort order', 'sort_order', 'position', 'priority order'],
  
  cardImagePath: ['card image', 'card_image', 'card image url', 'thumbnail', 'thumb', 'image'],
  heroImagePath: ['hero image', 'hero_image', 'hero image url', 'main image', 'large image'],
  
  seoTitle: ['seo title', 'seo_title', 'meta title'],
  seoDescription: ['seo description', 'seo_description', 'meta description'],
}

/**
 * Given an array of CSV headers, returns a best-guess mapping from 
 * each header to a product field (or null if no match).
 */
export function autoMapHeaders(headers: string[]): Map<string, ImportableField | null> {
  const result = new Map<string, ImportableField | null>()
  
  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]+/g, ' ')
    
    let matched: ImportableField | null = null
    
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [ImportableField, string[]][]) {
      const isMatch = aliases.some((alias) => {
        const normalizedAlias = alias.toLowerCase().replace(/[_\s-]+/g, ' ')
        return normalized === normalizedAlias
      })
      
      if (isMatch) {
        matched = field
        break
      }
    }
    
    result.set(header, matched)
  }
  
  return result
}
```

================================================================
TASK 4 — VALIDATION UTILITY
================================================================

Create src/lib/import/validate-rows.ts:

```typescript
import { productFormSchema, type ProductFormValues } from '@/lib/validations/product'
import type { ImportableField } from './auto-map'

export interface RowError {
  rowIndex: number  // 0-based, matches the rows array (display +1 in UI)
  field?: string
  message: string
}

export interface RowValidation {
  rowIndex: number
  raw: Record<string, string>
  mapped: Partial<ProductFormValues> | null  // null if mapping failed catastrophically
  errors: RowError[]
}

export interface ValidationSummary {
  total: number
  valid: number
  invalid: number
  duplicateSlugs: string[]
}

/**
 * Coerces a raw string value to the target field's type per Zod schema.
 */
function coerceValue(field: string, rawValue: string): unknown {
  const trimmed = rawValue.trim()
  
  if (field === 'featured') {
    return trimmed.toLowerCase() === 'true' || trimmed === '1' || trimmed.toLowerCase() === 'yes'
  }
  
  if (field === 'sortOrder') {
    const n = parseInt(trimmed, 10)
    return isNaN(n) ? undefined : n
  }
  
  return trimmed
}

export function validateRows(
  rows: Record<string, string>[],
  columnMapping: Map<string, ImportableField | null>,
  existingSlugs: Set<string>,
  validBrandSlugs: Set<string>,
  validCategorySlugs: Set<string>,
): { validations: RowValidation[]; summary: ValidationSummary } {
  // Reverse the mapping: field → CSV header
  const fieldToHeader = new Map<ImportableField, string>()
  for (const [header, field] of columnMapping) {
    if (field) fieldToHeader.set(field, header)
  }
  
  const validations: RowValidation[] = []
  const seenSlugs = new Set<string>()
  const duplicateSlugs: string[] = []
  
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    if (!raw) continue
    
    const errors: RowError[] = []
    const mapped: Record<string, unknown> = {}
    
    // Build the mapped object from CSV row using the column mapping
    for (const [field, header] of fieldToHeader) {
      const rawValue = raw[header] ?? ''
      const coerced = coerceValue(field, rawValue)
      if (coerced !== undefined && coerced !== '') {
        mapped[field] = coerced
      }
    }
    
    // Resolve brandSlug → brandId would happen at insert time on server
    // For validation here, just check the slug exists in our known list
    const brandSlug = mapped['brandSlug'] as string | undefined
    if (brandSlug && !validBrandSlugs.has(brandSlug)) {
      errors.push({
        rowIndex: i,
        field: 'brandSlug',
        message: `Unknown brand slug: "${brandSlug}". Must match an existing brand.`,
      })
    }
    
    const categorySlug = mapped['categorySlug'] as string | undefined
    if (categorySlug && !validCategorySlugs.has(categorySlug)) {
      errors.push({
        rowIndex: i,
        field: 'categorySlug',
        message: `Unknown category slug: "${categorySlug}". Must match an existing category.`,
      })
    }
    
    // Check for duplicate slug within the import or against existing DB
    const slug = mapped['slug'] as string | undefined
    if (slug) {
      if (existingSlugs.has(slug)) {
        errors.push({
          rowIndex: i,
          field: 'slug',
          message: `Slug "${slug}" already exists in the catalog.`,
        })
      } else if (seenSlugs.has(slug)) {
        errors.push({
          rowIndex: i,
          field: 'slug',
          message: `Slug "${slug}" appears multiple times in this import.`,
        })
        duplicateSlugs.push(slug)
      } else {
        seenSlugs.add(slug)
      }
    }
    
    // Strip brandSlug/categorySlug before Zod validation (Zod expects 
    // brandId/categoryId UUIDs — those are resolved server-side)
    const { brandSlug: _bs, categorySlug: _cs, ...zodInput } = mapped
    
    // Provide stub UUIDs so Zod doesn't complain; server will replace 
    // these with real lookups before insert
    const zodInputWithStubs = {
      ...zodInput,
      brandId: '00000000-0000-0000-0000-000000000000',
      categoryId: '00000000-0000-0000-0000-000000000000',
      specs: {},
      photoCarouselPaths: [],
    }
    
    const zodResult = productFormSchema.safeParse(zodInputWithStubs)
    
    if (!zodResult.success) {
      const fieldErrors = zodResult.error.flatten().fieldErrors
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (!messages || messages.length === 0) continue
        // Skip the stub fields (brandId, categoryId) — we validate those via slug
        if (field === 'brandId' || field === 'categoryId') continue
        const firstMessage = messages[0]
        if (firstMessage) {
          errors.push({ rowIndex: i, field, message: firstMessage })
        }
      }
    }
    
    validations.push({
      rowIndex: i,
      raw,
      mapped: { ...mapped, brandSlug, categorySlug } as Partial<ProductFormValues>,
      errors,
    })
  }
  
  const summary: ValidationSummary = {
    total: validations.length,
    valid: validations.filter((v) => v.errors.length === 0).length,
    invalid: validations.filter((v) => v.errors.length > 0).length,
    duplicateSlugs,
  }
  
  return { validations, summary }
}
```

================================================================
TASK 5 — BULK INSERT SERVER ACTION
================================================================

Create src/server/admin-import-actions.ts:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { products, brands, categories } from '@/db/schema'
import { requireSession } from '@/lib/auth-helpers'
import { productFormSchema } from '@/lib/validations/product'

interface ImportRow {
  slug: string
  name: string
  brandSlug: string
  categorySlug: string
  tier: 'hero' | 'featured' | 'longtail'
  tagline?: string
  description?: string
  cardSpec?: string
  searchKeywords?: string
  nameFr?: string
  taglineFr?: string
  descriptionFr?: string
  cardSpecFr?: string
  searchKeywordsFr?: string
  featured?: boolean
  sortOrder?: number
  cardImagePath?: string
  heroImagePath?: string
  seoTitle?: string
  seoDescription?: string
}

export interface ImportResult {
  ok: boolean
  inserted: number
  errors: Array<{ rowIndex: number; message: string }>
}

/**
 * Inserts an array of product rows in a single transaction.
 * If any row fails Zod validation OR DB constraint, the entire 
 * transaction rolls back. All-or-nothing semantics.
 */
export async function bulkInsertProducts(rows: ImportRow[]): Promise<ImportResult> {
  await requireSession()
  
  if (rows.length === 0) {
    return { ok: false, inserted: 0, errors: [{ rowIndex: -1, message: 'No rows to import' }] }
  }
  
  if (rows.length > 1000) {
    return { 
      ok: false, 
      inserted: 0, 
      errors: [{ rowIndex: -1, message: 'Too many rows (max 1000 per import)' }],
    }
  }
  
  // Pre-fetch brand and category slugs → IDs for all rows
  const uniqueBrandSlugs = [...new Set(rows.map((r) => r.brandSlug))]
  const uniqueCategorySlugs = [...new Set(rows.map((r) => r.categorySlug))]
  
  const [brandRows, categoryRows] = await Promise.all([
    db.select({ id: brands.id, slug: brands.slug })
      .from(brands)
      .where(inArray(brands.slug, uniqueBrandSlugs)),
    db.select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(inArray(categories.slug, uniqueCategorySlugs)),
  ])
  
  const brandSlugToId = new Map(brandRows.map((b) => [b.slug, b.id]))
  const categorySlugToId = new Map(categoryRows.map((c) => [c.slug, c.id]))
  
  // Build the insert rows with resolved IDs
  const errors: Array<{ rowIndex: number; message: string }> = []
  const toInsert: Array<Record<string, unknown>> = []
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    
    const brandId = brandSlugToId.get(row.brandSlug)
    const categoryId = categorySlugToId.get(row.categorySlug)
    
    if (!brandId) {
      errors.push({ rowIndex: i, message: `Brand slug not found: ${row.brandSlug}` })
      continue
    }
    
    if (!categoryId) {
      errors.push({ rowIndex: i, message: `Category slug not found: ${row.categorySlug}` })
      continue
    }
    
    // Final Zod validation with resolved IDs
    const candidate = {
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? '',
      description: row.description ?? '',
      cardSpec: row.cardSpec ?? '',
      searchKeywords: row.searchKeywords ?? '',
      nameFr: row.nameFr ?? '',
      taglineFr: row.taglineFr ?? '',
      descriptionFr: row.descriptionFr ?? '',
      cardSpecFr: row.cardSpecFr ?? '',
      searchKeywordsFr: row.searchKeywordsFr ?? '',
      brandId,
      categoryId,
      tier: row.tier,
      featured: row.featured ?? false,
      sortOrder: row.sortOrder ?? 100,
      specs: {},
      cardImagePath: row.cardImagePath ?? '',
      heroImagePath: row.heroImagePath ?? '',
      glbModelPath: '',
      photoCarouselPaths: [],
      seoTitle: row.seoTitle ?? '',
      seoDescription: row.seoDescription ?? '',
    }
    
    const parsed = productFormSchema.safeParse(candidate)
    if (!parsed.success) {
      const firstError = Object.entries(parsed.error.flatten().fieldErrors)[0]
      if (firstError) {
        const [field, messages] = firstError
        const message = messages?.[0] ?? 'Validation failed'
        errors.push({ rowIndex: i, message: `${field}: ${message}` })
      } else {
        errors.push({ rowIndex: i, message: 'Validation failed' })
      }
      continue
    }
    
    // Normalize FR empties to null
    toInsert.push({
      ...parsed.data,
      nameFr: parsed.data.nameFr || null,
      taglineFr: parsed.data.taglineFr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      cardSpecFr: parsed.data.cardSpecFr || null,
      searchKeywordsFr: parsed.data.searchKeywordsFr || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    })
  }
  
  // If any row failed pre-insert validation, abort
  if (errors.length > 0) {
    return { ok: false, inserted: 0, errors }
  }
  
  // Transactional bulk insert
  try {
    await db.transaction(async (tx) => {
      // Insert in chunks of 100 to avoid query size limits
      const chunkSize = 100
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
        await tx.insert(products).values(chunk as never)
      }
    })
    
    // Revalidate affected paths
    revalidatePath('/admin/products')
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/brands')
    revalidatePath('/categories')
    revalidatePath('/search')
    
    return { ok: true, inserted: toInsert.length, errors: [] }
  } catch (err) {
    console.error('[bulk-insert] Transaction failed:', err)
    return {
      ok: false,
      inserted: 0,
      errors: [{
        rowIndex: -1,
        message: err instanceof Error ? err.message : 'Database transaction failed',
      }],
    }
  }
}

/**
 * Returns the brand and category slugs in the system. Used by the 
 * client-side validation step to check brand/category references 
 * before sending to the server.
 */
export async function getImportContext() {
  await requireSession()
  
  const [existingSlugs, brandSlugs, categorySlugs] = await Promise.all([
    db.select({ slug: products.slug }).from(products).then((rows) => rows.map((r) => r.slug)),
    db.select({ slug: brands.slug }).from(brands).then((rows) => rows.map((r) => r.slug)),
    db.select({ slug: categories.slug }).from(categories).then((rows) => rows.map((r) => r.slug)),
  ])
  
  return {
    existingSlugs,
    brandSlugs,
    categorySlugs,
  }
}
```

================================================================
TASK 6 — IMPORT PAGE SHELL
================================================================

Create src/app/admin/products/import/page.tsx:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getImportContext } from '@/server/admin-import-actions'
import { ImportWizard } from '@/components/admin/products/import/ImportWizard'

export const metadata: Metadata = {
  title: 'Import products — Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function ImportProductsPage() {
  const context = await getImportContext()
  
  return (
    <div className="space-y-6 max-w-5xl">
      <Link 
        href="/admin/products"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        All products
      </Link>
      
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Products / Import
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          Bulk import<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-base text-text-secondary mt-4 max-w-2xl">
          Upload a CSV or XLSX file of products. Auto-detects columns, validates 
          each row, and commits everything in a single transaction.
        </p>
      </div>
      
      <ImportWizard context={context} />
    </div>
  )
}
```

Create src/components/admin/products/import/ImportWizard.tsx (client 
component shell that orchestrates the 3 steps):

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { ImportUploadStep } from './ImportUploadStep'
import { ImportMapStep } from './ImportMapStep'
import { ImportReviewStep } from './ImportReviewStep'
import { Check } from 'lucide-react'
import type { ImportableField } from '@/lib/import/auto-map'

interface ImportContext {
  existingSlugs: string[]
  brandSlugs: string[]
  categorySlugs: string[]
}

interface ImportWizardProps {
  context: ImportContext
}

interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
}

type Step = 'upload' | 'map' | 'review'

export function ImportWizard({ context }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<Map<string, ImportableField | null>>(new Map())
  
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: 'Upload' },
    { key: 'map', label: 'Map columns' },
    { key: 'review', label: 'Review & import' },
  ]
  
  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Import progress">
        <ol className="flex items-center gap-4">
          {steps.map((s, idx) => {
            const isActive = s.key === step
            const isComplete = steps.findIndex((x) => x.key === step) > idx
            return (
              <li key={s.key} className="flex items-center gap-2">
                <div
                  className={
                    isComplete
                      ? 'flex items-center justify-center w-7 h-7 rounded-full bg-accent text-surface-base'
                      : isActive
                      ? 'flex items-center justify-center w-7 h-7 rounded-full bg-surface-overlay text-text-primary ring-1 ring-accent'
                      : 'flex items-center justify-center w-7 h-7 rounded-full bg-surface-elevated text-text-muted'
                  }
                >
                  {isComplete ? <Check size={14} /> : <span className="font-mono text-xs">{idx + 1}</span>}
                </div>
                <span 
                  className={
                    isActive
                      ? 'font-body text-sm font-medium text-text-primary'
                      : 'font-body text-sm text-text-secondary'
                  }
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className="w-12 h-px bg-surface-overlay ml-2" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      
      <Card>
        <CardContent className="p-6">
          {step === 'upload' && (
            <ImportUploadStep
              onParsed={(p, autoMap) => {
                setParsed(p)
                setMapping(autoMap)
                setStep('map')
              }}
            />
          )}
          {step === 'map' && parsed && (
            <ImportMapStep
              parsed={parsed}
              mapping={mapping}
              onChange={setMapping}
              onBack={() => setStep('upload')}
              onNext={() => setStep('review')}
            />
          )}
          {step === 'review' && parsed && (
            <ImportReviewStep
              parsed={parsed}
              mapping={mapping}
              context={context}
              onBack={() => setStep('map')}
              onComplete={() => {
                setParsed(null)
                setMapping(new Map())
                setStep('upload')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

================================================================
TASK 7 — UPLOAD STEP
================================================================

Create src/components/admin/products/import/ImportUploadStep.tsx:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { Button } from '@/components/admin/ui/Button'
import { Upload, FileText, Download } from 'lucide-react'
import { parseFile } from '@/lib/import/parse-file'
import { autoMapHeaders, type ImportableField } from '@/lib/import/auto-map'
import { toast } from '@/lib/toast'

interface ImportUploadStepProps {
  onParsed: (
    parsed: { headers: string[]; rows: Record<string, string>[]; fileName: string },
    autoMap: Map<string, ImportableField | null>,
  ) => void
}

export function ImportUploadStep({ onParsed }: ImportUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  function handleFile(file: File) {
    startTransition(async () => {
      const result = await parseFile(file)
      
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      
      const autoMap = autoMapHeaders(result.headers)
      const matched = Array.from(autoMap.values()).filter((v) => v !== null).length
      
      toast.success(
        `Parsed ${result.rowCount} rows. Auto-matched ${matched} of ${result.headers.length} columns.`,
      )
      
      onParsed(
        {
          headers: result.headers,
          rows: result.rows,
          fileName: file.name,
        },
        autoMap,
      )
    })
  }
  
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }
  
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }
  
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (isPending) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  
  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        className={
          isDragging
            ? 'flex flex-col items-center justify-center gap-4 py-16 rounded-md border-2 border-dashed border-accent bg-accent/5 cursor-pointer transition-colors'
            : 'flex flex-col items-center justify-center gap-4 py-16 rounded-md border-2 border-dashed border-surface-overlay hover:border-text-muted bg-surface-elevated cursor-pointer transition-colors'
        }
      >
        {isPending ? (
          <>
            <FileText size={48} className="text-accent animate-pulse" />
            <p className="font-body text-base text-text-primary">Parsing file...</p>
          </>
        ) : (
          <>
            <Upload size={48} className="text-text-muted" />
            <div className="text-center">
              <p className="font-body text-base text-text-primary">
                Drop a CSV or XLSX file here, or click to browse
              </p>
              <p className="font-mono text-xs text-text-muted mt-2">
                CSV · TSV · XLSX · XLS · Max 5MB · Max 1000 rows
              </p>
            </div>
          </>
        )}
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      
      <div className="border-t border-surface-overlay pt-6">
        <h3 className="font-body text-base font-medium text-text-primary mb-2">
          Need a template?
        </h3>
        <p className="font-body text-sm text-text-secondary mb-3">
          Download a CSV template with all supported columns and a sample row.
        </p>
        <a 
          href="/api/admin/import-template"
          download="dtech-product-import-template.csv"
        >
          <Button variant="secondary">
            <Download size={14} />
            Download template
          </Button>
        </a>
      </div>
    </div>
  )
}
```

================================================================
TASK 8 — MAP STEP
================================================================

Create src/components/admin/products/import/ImportMapStep.tsx:

```tsx
'use client'

import { Button } from '@/components/admin/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { IMPORTABLE_FIELDS, type ImportableField } from '@/lib/import/auto-map'
import { ArrowRight, ArrowLeft } from 'lucide-react'

interface ImportMapStepProps {
  parsed: { headers: string[]; rows: Record<string, string>[]; fileName: string }
  mapping: Map<string, ImportableField | null>
  onChange: (mapping: Map<string, ImportableField | null>) => void
  onBack: () => void
  onNext: () => void
}

export function ImportMapStep({ parsed, mapping, onChange, onBack, onNext }: ImportMapStepProps) {
  const requiredFields: ImportableField[] = ['slug', 'name', 'brandSlug', 'categorySlug', 'tier']
  
  const mappedFields = new Set(Array.from(mapping.values()).filter((v) => v !== null))
  const missingRequired = requiredFields.filter((f) => !mappedFields.has(f))
  
  function updateMapping(header: string, field: ImportableField | null) {
    const newMapping = new Map(mapping)
    
    // If this field was already mapped to another header, clear that one
    if (field !== null) {
      for (const [h, f] of newMapping) {
        if (h !== header && f === field) {
          newMapping.set(h, null)
        }
      }
    }
    
    newMapping.set(header, field)
    onChange(newMapping)
  }
  
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Step 2 of 3
        </p>
        <h2 className="font-display text-xl text-text-primary tracking-tight">
          Map your columns
        </h2>
        <p className="font-body text-sm text-text-secondary mt-2">
          We auto-detected the columns where possible. Adjust any wrong mappings 
          or set columns to "Ignore" to skip them.
        </p>
      </div>
      
      {missingRequired.length > 0 && (
        <div className="px-4 py-3 rounded-md bg-semantic-warning/10 border border-semantic-warning/30">
          <p className="font-body text-sm text-semantic-warning">
            Missing required fields: {missingRequired.join(', ')}
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_2fr] gap-4 px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          <span>CSV column</span>
          <span />
          <span>Maps to</span>
        </div>
        
        {parsed.headers.map((header) => {
          const currentField = mapping.get(header) ?? null
          const sampleValue = parsed.rows[0]?.[header] ?? ''
          
          return (
            <div 
              key={header} 
              className="grid grid-cols-[1fr_auto_2fr] gap-4 items-center px-4 py-3 rounded-md bg-surface-elevated"
            >
              <div>
                <p className="font-body text-sm font-medium text-text-primary">{header}</p>
                {sampleValue && (
                  <p className="font-mono text-xs text-text-muted mt-1 truncate">
                    e.g. {sampleValue}
                  </p>
                )}
              </div>
              <ArrowRight size={14} className="text-text-muted" />
              <select
                value={currentField ?? ''}
                onChange={(e) => updateMapping(header, e.target.value as ImportableField || null)}
                className="bg-surface-base px-3 py-2 font-body text-sm text-text-primary rounded-md outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Ignore this column</option>
                <optgroup label="Required">
                  {(Object.entries(IMPORTABLE_FIELDS) as [ImportableField, typeof IMPORTABLE_FIELDS[ImportableField]][])
                    .filter(([, f]) => f.required)
                    .map(([key, f]) => (
                      <option key={key} value={key}>{f.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Optional">
                  {(Object.entries(IMPORTABLE_FIELDS) as [ImportableField, typeof IMPORTABLE_FIELDS[ImportableField]][])
                    .filter(([, f]) => !f.required)
                    .map(([key, f]) => (
                      <option key={key} value={key}>{f.label}</option>
                    ))}
                </optgroup>
              </select>
            </div>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-surface-overlay">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} />
          Back
        </Button>
        <Button 
          variant="primary" 
          onClick={onNext}
          disabled={missingRequired.length > 0}
        >
          Review {parsed.rows.length} rows
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )
}
```

================================================================
TASK 9 — REVIEW STEP
================================================================

Create src/components/admin/products/import/ImportReviewStep.tsx:

```tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/admin/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { Stat } from '@/components/admin/ui/Stat'
import { validateRows } from '@/lib/import/validate-rows'
import type { ImportableField } from '@/lib/import/auto-map'
import { bulkInsertProducts } from '@/server/admin-import-actions'
import { toast } from '@/lib/toast'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImportContext {
  existingSlugs: string[]
  brandSlugs: string[]
  categorySlugs: string[]
}

interface ImportReviewStepProps {
  parsed: { headers: string[]; rows: Record<string, string>[]; fileName: string }
  mapping: Map<string, ImportableField | null>
  context: ImportContext
  onBack: () => void
  onComplete: () => void
}

export function ImportReviewStep({ parsed, mapping, context, onBack, onComplete }: ImportReviewStepProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const { validations, summary } = useMemo(() => {
    return validateRows(
      parsed.rows,
      mapping,
      new Set(context.existingSlugs),
      new Set(context.brandSlugs),
      new Set(context.categorySlugs),
    )
  }, [parsed.rows, mapping, context])
  
  const canImport = summary.invalid === 0 && summary.valid > 0
  
  function handleImport() {
    if (!canImport) return
    
    const validRows = validations
      .filter((v) => v.errors.length === 0 && v.mapped !== null)
      .map((v) => v.mapped)
      .filter((m): m is NonNullable<typeof m> => m !== null)
    
    startTransition(async () => {
      const result = await bulkInsertProducts(validRows as never)
      
      if (!result.ok) {
        toast.error(
          result.errors[0]?.message ?? 'Import failed. No products were created.',
        )
        return
      }
      
      toast.success(`Imported ${result.inserted} products successfully.`)
      onComplete()
      router.refresh()
      router.push('/admin/products')
    })
  }
  
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Step 3 of 3
        </p>
        <h2 className="font-display text-xl text-text-primary tracking-tight">
          Review and import
        </h2>
        <p className="font-body text-sm text-text-secondary mt-2">
          File: <span className="font-mono">{parsed.fileName}</span>
        </p>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total rows" value={summary.total} />
        <Stat 
          label="Valid" 
          value={summary.valid} 
          hint={summary.valid === summary.total ? 'All rows pass' : undefined}
        />
        <Stat 
          label="Errors" 
          value={summary.invalid}
          hint={summary.invalid > 0 ? 'Fix CSV and re-upload' : 'Clean'}
        />
      </div>
      
      {summary.invalid > 0 && (
        <div className="px-4 py-3 rounded-md bg-semantic-error/10 border border-semantic-error/30">
          <p className="font-body text-sm text-semantic-error">
            <AlertCircle size={14} className="inline mr-1 -mt-0.5" />
            {summary.invalid} row{summary.invalid > 1 ? 's' : ''} have validation errors. 
            Fix them in your file and re-upload. Nothing will be imported until all rows are valid.
          </p>
        </div>
      )}
      
      {summary.valid > 0 && summary.invalid === 0 && (
        <div className="px-4 py-3 rounded-md bg-semantic-success/10 border border-semantic-success/30">
          <p className="font-body text-sm text-semantic-success">
            <CheckCircle2 size={14} className="inline mr-1 -mt-0.5" />
            All {summary.valid} rows are valid. Ready to import.
          </p>
        </div>
      )}
      
      {/* Per-row breakdown */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Row-by-row
        </p>
        {validations.map((v) => {
          const slug = v.mapped?.slug ?? '(no slug)'
          const name = v.mapped?.name ?? '(no name)'
          const hasErrors = v.errors.length > 0
          
          return (
            <div 
              key={v.rowIndex}
              className={
                hasErrors 
                  ? 'px-4 py-3 rounded-md bg-semantic-error/5 border border-semantic-error/20'
                  : 'px-4 py-3 rounded-md bg-surface-elevated'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">Row {v.rowIndex + 1}</span>
                    <Badge variant={hasErrors ? 'error' : 'success'}>
                      {hasErrors ? `${v.errors.length} error${v.errors.length > 1 ? 's' : ''}` : 'OK'}
                    </Badge>
                  </div>
                  <p className="font-body text-sm text-text-primary mt-1 truncate">
                    {name}
                  </p>
                  <p className="font-mono text-xs text-text-muted mt-0.5 truncate">
                    /{slug}
                  </p>
                </div>
              </div>
              {hasErrors && (
                <ul className="mt-3 space-y-1">
                  {v.errors.map((err, i) => (
                    <li key={i} className="font-body text-xs text-semantic-error">
                      {err.field && <span className="font-mono">{err.field}: </span>}
                      {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-surface-overlay">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeft size={14} />
          Back to mapping
        </Button>
        <Button 
          variant="primary" 
          onClick={handleImport}
          disabled={!canImport}
          loading={isPending}
        >
          Import {summary.valid} product{summary.valid !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}
```

================================================================
TASK 10 — TEMPLATE DOWNLOAD ROUTE
================================================================

Create src/app/api/admin/import-template/route.ts:

```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const csv = [
    // Header row
    [
      'slug',
      'name',
      'name_fr',
      'tagline',
      'tagline_fr',
      'description',
      'description_fr',
      'card_spec',
      'card_spec_fr',
      'search_keywords',
      'search_keywords_fr',
      'brand_slug',
      'category_slug',
      'tier',
      'featured',
      'sort_order',
      'card_image_path',
      'hero_image_path',
      'seo_title',
      'seo_description',
    ].join(','),
    // Sample data row
    [
      'hp-elitebook-840-g11',
      'HP EliteBook 840 G11',
      'HP EliteBook 840 G11',
      'Business performance with quiet design',
      'Performance professionnelle au design discret',
      'A long editorial description in English...',
      'Une longue description éditoriale en français...',
      'Intel Core Ultra 7 · 32GB · 1TB SSD',
      'Intel Core Ultra 7 · 32 Go · SSD 1 To',
      'business laptop ultraportable',
      'ordinateur portable professionnel',
      'hp',
      'laptops',
      'featured',
      'false',
      '200',
      '',
      '',
      '',
      '',
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(','),
  ].join('\n')
  
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dtech-product-import-template.csv"',
    },
  })
}
```

================================================================
TASK 11 — ADD IMPORT CTA TO PRODUCTS LIST
================================================================

Open src/app/admin/products/page.tsx. Find the header section with 
the "New product" button. Add a secondary "Import" button next to it:

Find this:
```tsx
<Link href="/admin/products/new">
  <Button variant="primary">
    <Plus size={16} />
    New product
  </Button>
</Link>
```

Replace with:
```tsx
<div className="flex items-center gap-2">
  <Link href="/admin/products/import">
    <Button variant="secondary">
      <Upload size={16} />
      Import
    </Button>
  </Link>
  <Link href="/admin/products/new">
    <Button variant="primary">
      <Plus size={16} />
      New product
    </Button>
  </Link>
</div>
```

Add the Upload import at the top:
```tsx
import { Plus, Upload } from 'lucide-react'  // add Upload to existing import
```

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

Admin routes (all 307 except template which is 401 without session):
  $adminRoutes = @(
    '/admin/products/import',
    '/admin/products'
  )
  foreach ($r in $adminRoutes) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r" }
  }

Template endpoint (401 since not authed):
  try {
    $res = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/import-template" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "Status: $($res.StatusCode)"
  } catch {
    Write-Host "401 expected (no session)"
  }

Public regression:
  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070')
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
git commit -m "feat: phase 7f — bulk CSV/XLSX import for products

NEW DEPENDENCIES:
- papaparse — CSV parsing in browser (~50KB)
- xlsx (SheetJS) — XLSX parsing in browser (~270KB)
- @types/papaparse (dev)

IMPORT INFRASTRUCTURE:
- src/lib/import/parse-file.ts — unified CSV/TSV/XLSX/XLS parser
  - Max 5MB file size, max 1000 rows
  - Returns headers + row objects keyed by header
  - Whitespace-trimmed values
- src/lib/import/auto-map.ts — column heuristic auto-mapping
  - 20 importable product fields with aliases for common CSV header 
    naming variations (English + French + abbreviations)
- src/lib/import/validate-rows.ts — per-row Zod + business validation
  - Brand/category slug existence checks
  - Slug uniqueness (against DB and within import)
  - Type coercion (boolean strings, numeric strings)

SERVER ACTIONS (src/server/admin-import-actions.ts):
- getImportContext — fetches existing slugs + valid brand/category slugs
- bulkInsertProducts — transactional all-or-nothing insert
  - Pre-fetches brand/category IDs from slugs
  - Final Zod validation with resolved IDs
  - Chunked inserts (100 at a time) within single transaction
  - Auth-guarded
  - Revalidates affected paths on success

ADMIN UI (/admin/products/import):
- 3-step wizard: Upload → Map → Review
- Step indicator with visual progress
- Drag-drop file upload with format detection
- Auto-mapping shows match count after parse
- Per-column dropdown with optgroup (Required vs Optional)
- Auto-deselection: choosing same field for second column clears first
- Validation report with per-row errors and field-level details
- Stat tiles showing total/valid/invalid counts
- All-or-nothing import: any row error blocks the import

TEMPLATE DOWNLOAD:
- /api/admin/import-template — auth-guarded CSV download
- Headers cover all 20 importable fields
- Sample row with realistic data

PRODUCTS LIST PAGE:
- New 'Import' button next to 'New product' button

OUT OF SCOPE (Phase 7g+):
- CSV import for brands/categories/users
- CSV export
- Image upload from CSV (use admin image upload for new images)
- Update-existing-products mode (only INSERT)
- Background job processing
- Email notifications on completion
- Audit log of imports"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] papaparse and xlsx installed
- [ ] /admin/products/import renders (redirects to /login without auth)
- [ ] /api/admin/import-template returns 401 without auth
- [ ] Auto-map heuristic includes all 20 fields with reasonable aliases
- [ ] Wizard steps navigate forward and back correctly
- [ ] Validation catches: missing required, bad brand/category slugs, 
      duplicate slugs (DB + import), Zod errors
- [ ] Bulk insert is transactional (all-or-nothing)
- [ ] Existing routes still return 200 (regression)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + per-area summary)
2. Files modified (especially src/app/admin/products/page.tsx for 
   Import CTA)
3. Bundle impact (papaparse + xlsx are client-side, lazy-loaded via 
   the import page being a separate route — should NOT impact other 
   admin page bundles)
4. Build verification outputs
5. Smoke test results
6. Any deviations from spec
7. Final commit hash

================================================================
DO NOT
================================================================

- Build CSV import for brands/categories/users
- Build CSV export
- Add update-existing-products mode (INSERT only)
- Background job processing
- Email notifications
- Modify the existing manual product CRUD (Phase 7c)
- Modify image upload pipeline (Phase 7d)
- Add new dependencies beyond papaparse + xlsx + @types/papaparse
- Modify v2 brand spec or admin UI primitives
- Touch /motion or (dev) routes
- Implement column drag-and-drop reordering (overkill)

================================================================
FAILURE MODES TO WATCH
================================================================

- If xlsx package install is slow: SheetJS is large. pnpm should 
  handle it; verify with pnpm list xlsx after install.

- If papaparse types are missing: @types/papaparse is dev dep. If 
  TS complains about Papa.parse, confirm types installed.

- If XLSX.utils.sheet_to_json returns wrong shape: the header: 1 
  option returns array of arrays. Map first row to headers manually. 
  This matches the parse-file.ts implementation.

- If column mapping auto-detects wrong field: heuristic is best-effort. 
  User can adjust in the Map step. Don't over-engineer the matching 
  — false positives are fine because user reviews.

- If validation step is slow with 1000 rows: validateRows runs all 
  Zod parses synchronously. For 1000 rows this is ~200ms — acceptable. 
  If complaints, memoize or chunk.

- If transaction rollback doesn't happen on partial failure: 
  db.transaction in Drizzle automatically rolls back on thrown error. 
  Confirm by intentionally inserting a row with duplicate slug to a 
  freshly seeded DB.

- If chunked inserts produce different results than single insert: 
  they shouldn't. Chunks of 100 are within Postgres parameter limits. 
  Same transaction, same rollback semantics.

- If template download returns HTML instead of CSV: confirm 
  Content-Type and Content-Disposition headers are set. 
  NextResponse.new() with explicit headers is correct.

- If "Brand slug not found" errors appear after successful auto-map: 
  the user's CSV has brand slugs that don't match Dtech's actual 
  brand slugs in DB. The error message tells them exactly what to 
  fix. Don't auto-create brands from CSV — explicit reference only.

- If specs JSONB field needs import: spec says specs={} for all 
  imports. If Dtech wants per-row specs, that's a Phase 7g+ enhancement 
  with its own column-mapping logic. Don't try to handle JSON in 
  CSV cells in this phase.

- If review step shows wrong row numbers: rowIndex is 0-based 
  internally, displayed as rowIndex + 1 in UI. Confirm consistency.

- If "All rows valid" but import fails: usually a database constraint 
  not caught by Zod. Read the error message carefully — it's surfaced 
  via the toast. Common cause: stale brand/category context (admin 
  deleted a brand mid-import). Refresh page to recover.