/**
 * Admin-specific design tokens. Extends the customer-side brand
 * tokens with admin-tuned values (warmer surfaces, larger spacing,
 * friendlier typography rhythm).
 *
 * Per brand v2 §12: admin and public are siblings, not twins. They
 * share the dark base canvas and continuous ambient motion; admin
 * keeps its glassmorphism + multi-color accents. This module exposes
 * the v2 brand tokens to admin code that wants programmatic access.
 */

import { brand } from './brand-tokens'

export const adminTokens = {
  colors: brand,

  surfaces: {
    base: 'oklch(0.13 0.012 250)',
    raised: 'oklch(0.17 0.014 250)',
    elevated: 'oklch(0.21 0.016 250)',
    interactive: 'oklch(0.24 0.020 250)',
    border: 'oklch(0.28 0.018 250)',
    borderStrong: 'oklch(0.38 0.020 250)',
  },

  type: {
    display: '2.5rem',
    title: '1.75rem',
    heading: '1.25rem',
    body: '0.9375rem',
    label: '0.8125rem',
    caption: '0.75rem',
    micro: '0.6875rem',
  },

  spacing: {
    xxs: '0.25rem',
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
    xxxl: '4rem',
    page: '5rem',
  },

  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },

  motion: {
    fast: '150ms',
    base: '220ms',
    slow: '360ms',
    slower: '540ms',
    easing: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      gentleOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },

  shadows: {
    sm: '0 1px 2px oklch(0.05 0 0 / 0.4)',
    md: '0 4px 12px oklch(0.05 0 0 / 0.5)',
    lg: '0 12px 32px oklch(0.05 0 0 / 0.6)',
    glow: '0 0 24px oklch(0.74 0.14 215 / 0.3)',
  },
} as const
