/**
 * ROUND 19 — per-brand editorial facts for /brands/[slug].
 *
 * Deliberately SMALL and language-neutral. Everything here is either a proper
 * noun (product-line names like "EliteBook", "Archer", "EcoTank" — identical
 * in fr/en/ar) or an enum key that the i18n dictionary turns into a sentence.
 * That is what lets one page template serve all 21 brands in three languages
 * without maintaining 60 blocks of hand-written copy.
 *
 * NOT a client module — the server route imports `brandStatus` to build
 * metadata. Keep it free of React and of `server-only`.
 *
 * ── On `status`, read this before editing ────────────────────────────────
 * The CACI company registry entry for SARL Hardware Technology Service names
 * exactly three brands it is an OFFICIAL distributor for — DELL, ASUS and
 * TP-LINK — and TP-LINK + AOC as EXCLUSIVE in Algeria. Everything else is
 * carried, not officially mandated, so it is marked `distributed`. Do not
 * promote a brand to `official` without a document that says so: the claim is
 * a commercial and legal one, not a design choice.
 */

export type EdBrandStatus = 'own' | 'exclusive' | 'official' | 'distributed'

/** Strength keys → `bstr.<key>` / `bstr.<key>.d` in the dictionary. */
export type EdBrandStrength =
  | 'security'
  | 'performance'
  | 'reliability'
  | 'value'
  | 'ecosystem'
  | 'autonomy'
  | 'coverage'
  | 'running'
  | 'design'

export interface EdBrandFacts {
  status: EdBrandStatus
  /** Product families — proper nouns, shown verbatim in every locale. */
  lines: string[]
  /** Exactly three, in display order. */
  strengths: EdBrandStrength[]
  /** Year the brand was founded — a neutral trust signal. Optional. */
  since?: number
}

const DEFAULT_FACTS: EdBrandFacts = {
  status: 'distributed',
  lines: [],
  strengths: ['reliability', 'value', 'coverage'],
}

export const ED_BRAND_FACTS: Record<string, EdBrandFacts> = {
  /* ── Hartech's own brands ── */
  dtech: {
    status: 'own',
    lines: ['PROTAB', 'Power Bank DP', 'DPC'],
    strengths: ['value', 'autonomy', 'running'],
  },
  'ink-master': {
    status: 'own',
    lines: ['Toner TK', 'Cartouches compatibles'],
    strengths: ['value', 'running', 'coverage'],
  },

  /* ── Exclusive in Algeria ── */
  'tp-link': {
    status: 'exclusive',
    lines: ['Archer', 'Deco', 'Omada', 'EAP', 'TL-SG'],
    strengths: ['coverage', 'value', 'ecosystem'],
    since: 1996,
  },
  aoc: {
    status: 'exclusive',
    lines: ['Gaming G-Line', 'Value V-Line'],
    strengths: ['performance', 'value', 'design'],
    since: 1967,
  },

  /* ── Official distribution ── */
  dell: {
    status: 'official',
    lines: ['Latitude', 'OptiPlex', 'Vostro', 'Precision', 'UltraSharp'],
    strengths: ['reliability', 'security', 'running'],
    since: 1984,
  },
  asus: {
    status: 'official',
    lines: ['ExpertBook', 'Vivobook', 'Zenbook', 'ROG', 'TUF Gaming', 'PRIME'],
    strengths: ['performance', 'ecosystem', 'design'],
    since: 1989,
  },

  /* ── Carried ── */
  hp: {
    status: 'distributed',
    lines: ['EliteBook', 'ProBook', 'Pro Tower', 'LaserJet', 'OfficeJet'],
    strengths: ['security', 'reliability', 'running'],
    since: 1939,
  },
  lenovo: {
    status: 'distributed',
    lines: ['ThinkPad', 'ThinkCentre', 'ThinkBook', 'V-Series'],
    strengths: ['reliability', 'value', 'running'],
    since: 1984,
  },
  epson: {
    status: 'distributed',
    lines: ['EcoTank', 'WorkForce', 'EB Series'],
    strengths: ['running', 'reliability', 'value'],
    since: 1942,
  },
  canon: {
    status: 'distributed',
    lines: ['i-SENSYS', 'imageRUNNER', 'PIXMA'],
    strengths: ['reliability', 'running', 'performance'],
    since: 1937,
  },
  msi: {
    status: 'distributed',
    lines: ['MPG', 'MAG', 'PRO'],
    strengths: ['performance', 'design', 'ecosystem'],
    since: 1986,
  },
  amd: {
    status: 'distributed',
    lines: ['Ryzen', 'Radeon'],
    strengths: ['performance', 'value', 'ecosystem'],
    since: 1969,
  },
  intel: {
    status: 'distributed',
    lines: ['Core', 'Xeon'],
    strengths: ['performance', 'reliability', 'ecosystem'],
    since: 1968,
  },
  gamemax: {
    status: 'distributed',
    lines: ['RGB-SMART', 'RGB PRO', 'GE Series'],
    strengths: ['value', 'design', 'performance'],
  },
  'game-revolution': {
    status: 'distributed',
    lines: ['Armaguedon', 'Apocalyps', 'Ragnarok'],
    strengths: ['performance', 'value', 'design'],
  },
  apc: {
    status: 'distributed',
    lines: ['Smart-UPS', 'Easy UPS SRV'],
    strengths: ['reliability', 'autonomy', 'security'],
    since: 1981,
  },
  unomat: {
    status: 'distributed',
    lines: ['UPS Rackmount', 'UPS Line'],
    strengths: ['autonomy', 'value', 'reliability'],
  },
  hiksemi: {
    status: 'distributed',
    lines: ['WAVE', 'NVMe M.2', 'ESSD T300S'],
    strengths: ['performance', 'value', 'reliability'],
  },
  tcl: {
    status: 'distributed',
    lines: ['LinkHub', 'LinkZone'],
    strengths: ['coverage', 'value', 'design'],
  },
  mercusys: {
    status: 'distributed',
    lines: ['MW Series'],
    strengths: ['value', 'coverage', 'ecosystem'],
  },
  reaction: {
    status: 'distributed',
    lines: ['SG Series'],
    strengths: ['value', 'performance', 'design'],
  },
}

export function brandFacts(slug: string): EdBrandFacts {
  return ED_BRAND_FACTS[slug] ?? DEFAULT_FACTS
}

export function brandStatus(slug: string): EdBrandStatus {
  return brandFacts(slug).status
}
