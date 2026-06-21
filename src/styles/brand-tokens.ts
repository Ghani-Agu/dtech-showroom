/**
 * Dtech brand tokens — v2 schema.
 *
 * Reference module. The live values consumed by Tailwind utilities are
 * defined in `src/app/globals.css` under @theme; this file is the
 * canonical source for documentation, theme-aware modules, and any
 * future programmatic consumers (e.g. canvas drawing, server-rendered
 * OG images).
 *
 * Per v2 §4: OKLCH only — no hex, no HSL. Color is added to a dark
 * canvas; it never replaces it. Default surface is base.void/surface.
 * Chroma palette is for *animation only* — never static.
 */

export const brand = {
  // ---------------------------------------------------------------
  // Layer 1 — the base canvas (95% of every surface)
  // ---------------------------------------------------------------
  base: {
    void: 'oklch(0.08 0.015 240)',
    surface: 'oklch(0.12 0.018 240)',
    raised: 'oklch(0.16 0.020 240)',
    edge: 'oklch(0.22 0.022 240)',
  },

  // ---------------------------------------------------------------
  // Text — warm-tinted whites against the cool darks (80 hue, not 90)
  // ---------------------------------------------------------------
  text: {
    primary: 'oklch(0.97 0.005 80)',
    secondary: 'oklch(0.78 0.008 80)',
    tertiary: 'oklch(0.58 0.010 80)',
    quiet: 'oklch(0.42 0.012 80)',
  },

  // ---------------------------------------------------------------
  // Accent — single dominant brand color. The Dtech color.
  // ---------------------------------------------------------------
  accent: {
    primary: 'oklch(0.78 0.18 220)',
    primaryHover: 'oklch(0.85 0.16 220)',
    primaryMuted: 'oklch(0.62 0.14 220)',
    primaryGlow: 'oklch(0.78 0.18 220 / 0.25)',
  },

  // ---------------------------------------------------------------
  // Chroma — animation-only palette. Never sits still.
  // ---------------------------------------------------------------
  chroma: {
    cool: 'oklch(0.70 0.18 240)',
    cyan: 'oklch(0.82 0.16 200)',
    violet: 'oklch(0.68 0.20 290)',
    warm: 'oklch(0.78 0.15 50)',
  },

  // ---------------------------------------------------------------
  // Semantic — state communication only (success/warning/error)
  // ---------------------------------------------------------------
  semantic: {
    success: 'oklch(0.78 0.16 150)',
    warning: 'oklch(0.82 0.16 75)',
    error: 'oklch(0.68 0.20 25)',
  },
} as const

/**
 * Elevation system (v2 §10). Introduced because v2 lifts the v1 ban
 * on drop shadows. Use sparingly and always with intent.
 *
 * Rules:
 *   - Only one `glow` per view at a time.
 *   - `cardHover` triggers on cursor proximity, not just direct hover.
 *   - Never elevate text — only the surface it sits on.
 */
export const elevation = {
  hairline: '0 0 0 1px oklch(0.22 0.022 240 / 0.5)',
  card: '0 4px 20px -4px oklch(0.04 0.01 240 / 0.5), 0 0 0 1px oklch(0.22 0.022 240 / 0.4)',
  cardHover:
    '0 8px 32px -6px oklch(0.04 0.01 240 / 0.6), 0 0 0 1px oklch(0.78 0.18 220 / 0.3)',
  glow: '0 0 32px -4px oklch(0.78 0.18 220 / 0.35)',
  deep: '0 24px 60px -12px oklch(0.04 0.01 240 / 0.8)',
} as const

/**
 * Type scale (1.250 ratio) — unchanged from v1 mechanically. Per v2 §6
 * the *largest* sizes are now expected to be used, not avoided.
 */
export const type = {
  scale: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.563rem',
    '3xl': '1.953rem',
    '4xl': '2.441rem',
    '5xl': '3.052rem',
    '6xl': '3.815rem',
    '7xl': '4.768rem',
    '8xl': '5.960rem',
    '9xl': '7.451rem',
  },
  leading: {
    tight: '1.05',
    snug: '1.20',
    normal: '1.45',
    relaxed: '1.65',
  },
  tracking: {
    tight: '-0.02em',
    snug: '-0.01em',
    normal: '0',
    wide: '0.04em',
    wider: '0.08em',
  },
} as const

export type BrandTokens = typeof brand
export type Elevation = typeof elevation
