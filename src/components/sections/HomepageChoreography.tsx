'use client'

import { useMemo } from 'react'
import {
  useScrollChoreography,
  type ScrollChoreographyConfig,
} from '@/hooks/useScrollChoreography'

/**
 * Scroll-triggered reveals for the homepage:
 * featured products, brand strip, category grid + hairline accents,
 * footer wordmark scale-in. Mount once at the top of the homepage.
 */
export function HomepageChoreography() {
  const configs = useMemo<ScrollChoreographyConfig[]>(
    () => [
      // Featured products row — stagger from below as they enter viewport.
      {
        selector: '[data-scroll-featured]',
        from: { opacity: 0, y: 40 },
        to: {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
        },
        stagger: 0.1,
        start: 'top 75%',
      },
      // Brand strip — left-to-right stagger.
      {
        selector: '[data-scroll-brand]',
        from: { opacity: 0, x: -24 },
        to: {
          opacity: 1,
          x: 0,
          duration: 0.7,
          ease: 'power3.out',
        },
        stagger: 0.12,
        start: 'top 80%',
      },
      // Category cards — 2×3 grid pattern via GSAP grid stagger.
      {
        selector: '[data-scroll-category]',
        from: { opacity: 0, y: 32 },
        to: {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
        },
        stagger: {
          grid: 'auto',
          from: 'start',
          amount: 0.6,
          ease: 'power2.inOut',
        },
        start: 'top 75%',
      },
      // Category accents — hairline draw-in from the left after each card.
      {
        selector: '[data-scroll-category] .card-accent',
        from: { scaleX: 0 },
        to: {
          scaleX: 1,
          duration: 0.6,
          ease: 'power2.out',
        },
        stagger: 0.08,
        start: 'top 70%',
      },
      // Footer wordmark — closing cinematic scale-in.
      {
        selector: '[data-scroll-wordmark]',
        from: { opacity: 0, scale: 0.92 },
        to: {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: 'power3.out',
        },
        start: 'top 85%',
      },
    ],
    []
  )

  useScrollChoreography(configs)

  return null
}

export default HomepageChoreography
