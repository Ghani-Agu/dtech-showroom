/**
 * Canonical motion module for Dtech Showroom.
 * All motion in the project must consume these tokens.
 * Spring physics is banned per v2 brand spec §5.2.
 */

import type { Variants } from 'framer-motion'

// Easing curves as cubic-bezier tuples (Framer-compatible)
export const easing = {
  out: [0.22, 1, 0.36, 1],
  outExpo: [0.16, 1, 0.30, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.50, 0, 0.75, 0],
} as const

// Durations in seconds (Framer-native)
export const duration = {
  fast: 0.15,
  base: 0.28,
  slow: 0.56,
  cinematic: 1.1,
  hero: 2.2,
} as const

// Stagger timings in seconds
export const stagger = {
  sibling: 0.06,
  row: 0.12,
} as const

// Canonical Framer Motion variants.
// Each variant has 'hidden' and 'visible' states.
// Variants are designed to be composable with whileInView or
// animate prop drivers.

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.out },
  },
}

export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.base, ease: easing.out },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.sibling,
      delayChildren: 0,
    },
  },
}

export const staggerRow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.row,
    },
  },
}

// Cinematic reveal — used for hero-tier moments only
export const cinematicReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.cinematic, ease: easing.outExpo },
  },
}

// GSAP easing strings — pass directly to gsap.to() / gsap.from() ease prop.
export const gsapEasing = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  outExpo: 'cubic-bezier(0.16, 1, 0.30, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  in: 'cubic-bezier(0.50, 0, 0.75, 0)',
} as const
