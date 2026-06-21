/**
 * Canonical motion module for Dtech Showroom.
 *
 * All motion in the project must consume these tokens. Per brand v2 §7
 * the motion language is "continuous, layered, responsive" — atmospheric
 * background motion is always on (long cycles), interactions respond
 * within 150–300ms (damped), and choreographed reveals stagger between
 * siblings.
 *
 * v2 §7 ALLOWS spring physics; the prior "spring physics is banned"
 * directive came from an intermediate spec that v2 supersedes.
 */

import type { Variants } from 'framer-motion'

// =====================================================================
// Easing curves as cubic-bezier tuples (Framer-compatible)
// =====================================================================
export const easing = {
  out: [0.22, 1, 0.36, 1],
  outExpo: [0.16, 1, 0.30, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.50, 0, 0.75, 0],
} as const

// =====================================================================
// Durations in seconds (Framer-native)
//
// v2 §7 additions: `instant` for micro-feedback, `ambient` and
// `ambientLong` for background drift cycles. Existing keys preserved.
// =====================================================================
export const duration = {
  instant: 0.1,       // v2: micro-interactions (key press feedback)
  fast: 0.15,         // hovers, focus rings
  base: 0.28,         // standard transitions
  slow: 0.56,         // page section reveals
  cinematic: 1.1,     // hero entrances
  hero: 2.2,          // legacy alias; prefer `cinematic`
  ambient: 8.0,       // v2: short atmospheric drift cycle
  ambientLong: 30.0,  // v2: long atmospheric drift cycle
} as const

// =====================================================================
// Stagger timings in seconds — v2 §7 calls for 50–100ms between siblings.
// =====================================================================
export const stagger = {
  sibling: 0.06,
  row: 0.12,
} as const

// =====================================================================
// Spring physics token — v2 §7. Soft overshoot only, never cartoon
// bounce (anti-pattern called out in §7 principle 4).
// =====================================================================
export const spring = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
} as const

// =====================================================================
// Canonical Framer Motion variants. Composable with whileInView or
// animate prop drivers.
// =====================================================================

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

// =====================================================================
// GSAP easing strings — pass directly to gsap.to() / gsap.from() ease prop.
// =====================================================================
export const gsapEasing = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  outExpo: 'cubic-bezier(0.16, 1, 0.30, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  in: 'cubic-bezier(0.50, 0, 0.75, 0)',
} as const
