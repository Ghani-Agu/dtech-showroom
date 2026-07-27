/**
 * Éditorial skin — pure view types & constants (no React, no server imports)
 * so both the server mapping (src/server/editorial-data.ts) and the client
 * sections can import them.
 */

export interface EdCat {
  id: string
  name: string
  /** Localized category description from the DB — the ccard hover blurb. */
  desc: string
  /** Category hero image (real), or null → editorial slot placeholder. */
  img: string | null
  count: number
  /** EDPATH icon name. */
  icon: string
  /** Up to 5 real model names for the tiers panel. */
  tops: string[]
}

export interface EdBrandItem {
  id: string
  name: string
  count: number
}

/** A real product surfaced inside the bento's "proof" artifacts. */
export interface EdBentoProd {
  img: string | null
  name: string
  cat: string
}

/** Real-catalogue material for the bento cards (photos + document rows). */
export interface EdBento {
  /** 3 products (distinct categories) for the tested-before-delivery shelf. */
  shelf: EdBentoProd[]
  /** One machine for the SAV workbench card. */
  sav: EdBentoProd | null
  /** Real model names for the quote-document rows. */
  invoice: { name: string; cat: string }[]
}

export interface EdData {
  cats: EdCat[]
  brands: EdBrandItem[]
  productCount: number
  brandCount: number
  heroImage: string | null
  bento: EdBento
}

/** Tier-panel colors — lorolabs-style multi-color: every row opens on its
 *  own distinct hue, deliberately NOT the site theme (user request). Ordered
 *  so neighbouring rows never share a family, including at the wrap point. */
export const ED_TIER_COLORS = [
  '#6C4DF6', // violet
  '#EE5D3C', // vermilion
  '#2B5CE6', // royal blue
  '#F5B40E', // amber (light — ink text)
  '#149E52', // emerald
  '#D6337F', // magenta
  '#0F2557', // midnight navy
  '#F07C12', // tangerine
  '#5B21B6', // deep purple
  '#8AC926', // lime (light — ink text)
  '#B42318', // crimson
  '#1D1B19', // ink black
  '#FF4F79', // rose
] as const

/** Categories the design groups as workstations (first tier group). */
export const ED_WORKSTATION_SLUGS = ['laptops', 'desktops', 'all-in-one', 'monitors', 'tablets']

/** Tiers section shows only the main ranges (top by stock, per group) —
 *  the long tail stays reachable through the catalogue link under it. */
export const ED_TIERS_MAX = { work: 4, rest: 6 } as const
