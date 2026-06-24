/**
 * Shared types for the Brand storefront skin. Pure (no React/server imports)
 * so both the server page and client components can import it.
 *
 * Every field is fed by the SAME catalogue queries the classic design uses —
 * the Brand skin only changes how the data is presented.
 */

export interface BrandProduct {
  slug: string
  name: string
  /** Brand display name (e.g. "HP"). */
  brand: string
  /** Category slug (used for filtering). */
  cat: string
  /** Category display name. */
  catName: string
  /** Short spec line shown on the card. */
  spec: string
  /** Resolved product image URL, or null when none. */
  img: string | null
  featured: boolean
}

export interface BrandCategory {
  /** Category slug. */
  id: string
  name: string
  count: number
  /** GridCatIcon kind. */
  icon: string
}

export interface BrandBrandItem {
  id: string
  name: string
  count: number
}

export interface BrandData {
  products: BrandProduct[]
  categories: BrandCategory[]
  brands: BrandBrandItem[]
  /** Hero slider image URLs (real images); empty falls back to a styled panel. */
  heroImages: string[]
}

/** Official WhatsApp ordering number (matches the classic site / editor registry). */
export const BRAND_WHATSAPP = '213560990506'
