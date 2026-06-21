import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

/**
 * Font system — Geist (Sans + Mono).
 *
 * Geist's GeistSans handles both display and body roles. We export
 * aliases (`displayFont` / `bodyFont` / `monoFont`) matching the
 * previous module's public API so existing imports — notably the
 * root layout's `${displayFont.variable} ${bodyFont.variable}
 * ${monoFont.variable}` className concat — keep working without
 * change.
 *
 * Geist's NextFont objects expose `--font-geist-sans` and
 * `--font-geist-mono` CSS variables. globals.css aliases these to
 * the project's existing `--font-display` / `--font-body` /
 * `--font-mono` variable names (the indirection avoids the
 * self-referential `--font-X: var(--font-X)` pitfall documented in
 * memory feedback_tailwind_v4_nextfont).
 */
export const displayFont = GeistSans
export const bodyFont = GeistSans
export const monoFont = GeistMono
