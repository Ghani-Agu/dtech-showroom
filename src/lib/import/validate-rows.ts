import {
  productFormSchema,
  type ProductFormValues,
} from '@/lib/validations/product'
import type { ImportableField } from './auto-map'

export interface RowError {
  rowIndex: number
  field?: string
  message: string
}

export interface RowValidation {
  rowIndex: number
  raw: Record<string, string>
  mapped: Partial<ProductFormValues> | null
  errors: RowError[]
}

export interface ValidationSummary {
  total: number
  valid: number
  invalid: number
  duplicateSlugs: string[]
}

function coerceValue(field: string, rawValue: string): unknown {
  const trimmed = rawValue.trim()

  if (field === 'featured') {
    return (
      trimmed.toLowerCase() === 'true' ||
      trimmed === '1' ||
      trimmed.toLowerCase() === 'yes'
    )
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
  validCategorySlugs: Set<string>
): { validations: RowValidation[]; summary: ValidationSummary } {
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

    for (const [field, header] of fieldToHeader) {
      const rawValue = raw[header] ?? ''
      const coerced = coerceValue(field, rawValue)
      if (coerced !== undefined && coerced !== '') {
        mapped[field] = coerced
      }
    }

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

    // Build Zod input: drop brandSlug/categorySlug, add stub UUIDs and required jsonb defaults
    const zodInput: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(mapped)) {
      if (k === 'brandSlug' || k === 'categorySlug') continue
      zodInput[k] = v
    }
    zodInput['brandId'] = '00000000-0000-0000-0000-000000000000'
    zodInput['categoryId'] = '00000000-0000-0000-0000-000000000000'
    zodInput['specs'] = {}
    zodInput['photoCarouselPaths'] = []

    const zodResult = productFormSchema.safeParse(zodInput)

    if (!zodResult.success) {
      const fieldErrors = zodResult.error.flatten().fieldErrors
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (!messages || messages.length === 0) continue
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
