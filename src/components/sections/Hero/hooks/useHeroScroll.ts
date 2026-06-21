'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Hero scroll progress 0..1.
 *
 * - 0 = hero fully in view, scroll at top of hero
 * - 1 = hero fully out of view, top of hero is at viewport bottom
 *
 * Returns a ref so consumers (e.g. R3F useFrame loops) can poll without
 * triggering React re-renders.
 *
 * Implementation note: Lenis is mounted globally as the smooth-scroll
 * driver, but its programmatic API is exposed through ScrollProvider
 * rather than a hook. window.scrollY + element rect is what Lenis-aware
 * scroll mappers ultimately read anyway, so we read it here directly.
 */
export function useHeroScroll(
  sectionRef: RefObject<HTMLElement | null>
): RefObject<number> {
  const progress = useRef<number>(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    function update() {
      const node = sectionRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      // When rect.top is 0 (top of hero at viewport top) — progress 0.
      // When rect.top is -rect.height (top of hero is at viewport bottom
      // — i.e. fully scrolled past) — progress 1.
      const h = rect.height || 1
      const p = -rect.top / h
      progress.current = Math.max(0, Math.min(1, p))
    }

    update()
    // Passive listeners — we never preventDefault.
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [sectionRef])

  return progress
}
