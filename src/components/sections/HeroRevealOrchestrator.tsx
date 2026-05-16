'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Page-load stagger for hero elements tagged with `data-hero-reveal`.
 * Returns null — pure orchestrator. Mount once at the top of the homepage.
 */
export function HeroRevealOrchestrator() {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      gsap.set('[data-hero-reveal]', { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.set('[data-hero-reveal]', { opacity: 0, y: 24 })
      tl.to('[data-hero-reveal]', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.15,
      })
    })

    return () => ctx.revert()
  }, [prefersReducedMotion])

  return null
}

export default HeroRevealOrchestrator
