'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

export interface ScrollChoreographyConfig {
  selector: string
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  stagger?: number | gsap.StaggerVars
  start?: string
  end?: string
  toggleActions?: string
}

export function useScrollChoreography(configs: ScrollChoreographyConfig[]) {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      // Snap all configured elements to their "to" state instantly.
      configs.forEach(({ selector, to }) => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el) => {
          gsap.set(el, { ...to, opacity: 1 })
        })
      })
      return
    }

    const triggers: ScrollTrigger[] = []

    configs.forEach(
      ({
        selector,
        from = { opacity: 0, y: 32 },
        to = { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        stagger = 0,
        start = 'top 80%',
        toggleActions = 'play none none reverse',
      }) => {
        const elements = document.querySelectorAll(selector)
        if (elements.length === 0) return

        // Set initial state immediately (prevents flash of final state).
        gsap.set(elements, from)

        const trigger = ScrollTrigger.create({
          trigger: elements[0] as Element,
          start,
          toggleActions,
          onEnter: () => {
            gsap.to(elements, { ...to, stagger })
          },
          onLeaveBack: () => {
            gsap.to(elements, { ...from, duration: 0.4 })
          },
        })

        triggers.push(trigger)
      }
    )

    // Refresh once configs are wired so ScrollTrigger picks up final layout.
    ScrollTrigger.refresh()

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [configs, prefersReducedMotion])
}
