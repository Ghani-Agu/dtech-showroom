'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced) return

    /* ROUND 21b — exact lorolabs.ai scroll engine (read live from their
       production Lenis instance — window.__lenis.options — 2026-07-29):
       lerp-based smoothing instead of the old duration:1.1 + easeOutExpo.
       A duration tween restarts a 1.1s animation on EVERY wheel tick, which
       reads as "waits, then slides" — under rapid trackpad deltas it feels
       like the page locks then catches up. lerp converges a fixed 13% per
       frame: response is immediate and velocity-continuous. duration+easing
       below only govern programmatic scrollTo (anchors), same as lorolabs. */
    const lenis = new Lenis({
      lerp: 0.13,
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.35,
      duration: 1,
      easing: (t) => 1 - Math.pow(1 - t, 4),
    })

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [prefersReduced])

  return <>{children}</>
}
