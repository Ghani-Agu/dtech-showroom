/**
 * Site-design switch — pure types & helpers (no server-only, no Prisma/Drizzle).
 *
 * The storefront can render in one of two complete designs that share the
 * SAME backend, products, categories, brands and inquiry flow — only the
 * interface differs:
 *   - `classic` — the current/original D-Tech showroom design.
 *   - `brand`   — the new "dtech Brand" design (teal + yellow, light/dark,
 *                 FR/EN/AR), ported from the Claude design project.
 *
 * The active design lives in the `site_pages` table under the key
 * `site:design` as `{ active: DesignId }`, with the same draft → published
 * model the rest of the editor uses (see src/server/design-actions.ts).
 *
 * This module is importable by BOTH client components (the Apparence admin
 * UI) and server code, so it must stay free of any server-only imports.
 */

export const DESIGN_IDS = ['classic', 'brand'] as const
export type DesignId = (typeof DESIGN_IDS)[number]

/** Until an explicit choice is published, the site stays on the current design. */
export const DEFAULT_DESIGN: DesignId = 'classic'

export function isDesignId(value: unknown): value is DesignId {
  return typeof value === 'string' && (DESIGN_IDS as readonly string[]).includes(value)
}

/** Read a stored value defensively, falling back to the current design. */
export function coerceDesign(value: unknown): DesignId {
  if (isDesignId(value)) return value
  if (value && typeof value === 'object' && 'active' in value) {
    return coerceDesign((value as { active: unknown }).active)
  }
  return DEFAULT_DESIGN
}

export interface DesignMeta {
  /** French label shown in the admin. */
  label: string
  /** Short French description. */
  desc: string
}

export const DESIGN_META: Record<DesignId, DesignMeta> = {
  classic: {
    label: 'Design actuel',
    desc: 'Le design original du showroom D-Tech, actuellement en ligne.',
  },
  brand: {
    label: 'Nouveau design — dtech Brand',
    desc: 'Le nouveau design teal & jaune (clair/sombre, FR/EN/AR). Mêmes produits, même back-office.',
  },
}
