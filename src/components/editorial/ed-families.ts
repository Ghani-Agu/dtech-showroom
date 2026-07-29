/**
 * ROUND 19 — the seven commercial universes the 20 catalogue categories roll
 * up into. One source of truth shared by the Catalogue mega-menu (client),
 * the /catalogue page (client) and the Gaming page's parts rail, so the
 * grouping can never drift between surfaces.
 *
 * NOT a client module on purpose: server components import GAMING_SLUGS to
 * pre-filter data. Keep it free of React and of `server-only`.
 *
 * `slugs` is ordered — it drives display order inside a family. Any category
 * slug that is NOT listed here still renders, collected into a trailing
 * "other" family, so adding a category in the admin can never make it vanish
 * from the catalogue page.
 */

export interface EdFamily {
  /** i18n key suffix: `fam.<id>` for the label, `fam.<id>.d` for the blurb. */
  id: string
  slugs: string[]
  /** Accent hue used for the family's tile gradient + rules. */
  hue: number
  icon: EdFamilyIcon
}

export type EdFamilyIcon =
  | 'work'
  | 'display'
  | 'print'
  | 'build'
  | 'net'
  | 'power'
  | 'play'
  | 'other'

export const ED_FAMILIES: EdFamily[] = [
  { id: 'work', hue: 188, icon: 'work', slugs: ['laptops', 'desktops', 'all-in-one', 'tablets'] },
  { id: 'display', hue: 262, icon: 'display', slugs: ['monitors', 'projectors'] },
  { id: 'print', hue: 24, icon: 'print', slugs: ['printers', 'scanners', 'consumables'] },
  {
    id: 'build',
    hue: 330,
    icon: 'build',
    slugs: [
      'motherboards',
      'processors',
      'graphics-cards',
      'storage',
      'pc-cases',
      'cooling',
      'power-supplies',
    ],
  },
  { id: 'net', hue: 158, icon: 'net', slugs: ['networking'] },
  { id: 'power', hue: 42, icon: 'power', slugs: ['ups', 'power-banks'] },
  { id: 'play', hue: 286, icon: 'play', slugs: ['gaming'] },
]

/**
 * ── Gaming classification ────────────────────────────────────────────────
 *
 * A product is gaming when ANY of these holds:
 *   1. its category is gaming or rig-building by nature (`GAMING_CORE_SLUGS`);
 *   2. its brand exists only for gaming (`GAMING_BRANDS`);
 *   3. its model name carries a gaming token (`GAMING_NAME_RE`).
 *
 * Rule 3 is what lets a genuinely gaming product in a generalist category
 * qualify — the DELL GAMING G15 laptop and the ASUS ROG RAPTURE router are
 * both real gaming products filed under `laptops` / `networking`. It is also
 * why `monitors` is NOT a core slug: the category holds 50 references and
 * only 16 are gaming panels, so it qualifies per-product rather than wholesale.
 *
 * Always call `isGamingProduct()`; never test the lists directly.
 */

/** Categories that are gaming (or rig-building) by nature. */
export const GAMING_CORE_SLUGS = [
  'gaming',
  'graphics-cards',
  'processors',
  'motherboards',
  'pc-cases',
  'cooling',
  'power-supplies',
] as const

/**
 * The parts a rig is assembled from, in build order — drives the configurator.
 *
 * Monitors are deliberately NOT here. A screen is not a build step, and the
 * step links go to the plain `/products?category=…` facet: for these seven the
 * whole category is gaming so the step's count and the destination agree,
 * whereas a "Écran · 16 références" step would have landed on a page of 50
 * mostly-office monitors. Screens have their own collection instead.
 */
export const GAMING_BUILD_ORDER = [
  'processors',
  'motherboards',
  'graphics-cards',
  'storage',
  'cooling',
  'power-supplies',
  'pc-cases',
] as const

/**
 * Brands whose entire range is gaming-oriented.
 *
 * MSI is deliberately ABSENT: it sells the office `PRO MP` monitor line
 * alongside the gaming `MPG`/`MAG` line, and listing it wholesale filed two
 * office screens as gaming gear. Its gaming SKUs are caught by the name
 * tokens instead. AOC is present — its single catalogue reference is a
 * G-line gaming panel, and it is one of the two brands the company holds
 * exclusive distribution on.
 */
export const GAMING_BRANDS = ['gamemax', 'game-revolution', 'reaction', 'aoc'] as const

/**
 * Model-name tokens that mark a gaming SKU inside a generalist brand.
 *
 * Matched as WHOLE WORDS, never substrings. Measured against the live
 * catalogue, a naive `includes()` pulled in three Canon i**mag**eRUNNER
 * copiers and two Epson **MAG**ENTA ink bottles on the token `mag` alone —
 * i.e. the Gaming page would have opened with office photocopiers. Keep any
 * token you add here short-and-safe under `\b…\b`.
 */
export const GAMING_NAME_HINTS = [
  'rog',
  'tuf',
  'mpg',
  'mag',
  'gaming',
  'gamer',
  'radeon',
  'geforce',
  'rtx',
  'gtx',
] as const

/**
 * `\d*` before the closing boundary: model names glue the token to digits —
 * `GTX1650`, `RTX4090`, `TUF3` — and a bare `\b…\b` misses all of them. It
 * still rejects the false positives, because `\d*` cannot match letters:
 * MAGENTA fails the trailing boundary, i**mag**eRUNNER fails the leading one.
 */
const GAMING_NAME_RE = new RegExp(`\\b(${GAMING_NAME_HINTS.join('|')})\\d*\\b`, 'i')

/** Minimal product shape the gaming predicate needs. */
export interface GamingCandidate {
  name: string
  brandSlug: string
  categorySlug: string
}

export function isGamingProduct(p: GamingCandidate): boolean {
  const cat = p.categorySlug
  if ((GAMING_CORE_SLUGS as readonly string[]).includes(cat)) return true
  if ((GAMING_BRANDS as readonly string[]).includes(p.brandSlug)) return true
  return GAMING_NAME_RE.test(p.name)
}

/** Family a category slug belongs to, or null when it is unclassified. */
export function familyOf(slug: string): EdFamily | null {
  return ED_FAMILIES.find((f) => f.slugs.includes(slug)) ?? null
}

/**
 * Bucket a category list into families, preserving the declared slug order
 * inside each family and appending an `other` family for anything unmapped.
 * Families with no matching category are dropped.
 */
export function groupByFamily<T extends { slug: string }>(
  cats: T[]
): { family: EdFamily; cats: T[] }[] {
  const bySlug = new Map(cats.map((c) => [c.slug, c]))
  const claimed = new Set<string>()
  const out: { family: EdFamily; cats: T[] }[] = []

  for (const family of ED_FAMILIES) {
    const picked: T[] = []
    for (const slug of family.slugs) {
      const c = bySlug.get(slug)
      if (c) {
        picked.push(c)
        claimed.add(slug)
      }
    }
    if (picked.length) out.push({ family, cats: picked })
  }

  const rest = cats.filter((c) => !claimed.has(c.slug))
  if (rest.length) {
    out.push({
      family: { id: 'other', hue: 210, icon: 'other', slugs: rest.map((c) => c.slug) },
      cats: rest,
    })
  }
  return out
}
