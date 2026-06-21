'use client'

import { useEffect, useRef } from 'react'
import { Link } from '@/i18n/routing'

export interface HeroOverlayProps {
  /** "Dtech" — first letter renders in cyan, rest in white. */
  headlinePrefix: string
  /** "  sources the hardware that matters." — leading space is
   *  intentional, ensures correct spacing after the prefix. */
  headlineRest: string
  subhead: string
  primaryCTA: string
  scrollCue: string
}

/**
 * HTML typography overlay for the hero. Sits above the canvas in
 * stacking order, pointer-events:none on the containers so the canvas
 * still receives cursor events. The CTA itself is pointer-events-auto.
 *
 * Subscribes to `--hero-overlay-opacity` (set by HeroScene via the
 * scroll progress hook) so the entire overlay can fade as the user
 * scrolls into the next section, without re-rendering React.
 */
export function HeroOverlay({
  headlinePrefix,
  headlineRest,
  subhead,
  primaryCTA,
  scrollCue,
}: HeroOverlayProps) {
  // Local intro fade — entrance only, runs once on mount.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    el.style.opacity = '0'
    const id = requestAnimationFrame(() => {
      el.style.transition = 'opacity 800ms ease-out'
      el.style.opacity = '1'
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden="false"
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        opacity: 'var(--hero-overlay-opacity, 1)',
      }}
    >
      {/* Primary content stack — upper-left third of viewport. The
          headline reads first when the user lands. Vertically anchored
          at 44% (was 35%) with translate-y compensation so the FR
          headline doesn't clip above the viewport. Left offset widened
          to 48px / 7vw for breathing room from the viewport edge. */}
      <div
        className="absolute z-10 max-w-[640px] -translate-y-1/2"
        style={{
          top: '44%',
          left: 'max(48px, 7vw)',
        }}
      >
        <h1
          className="font-display font-light tracking-tight"
          style={{
            fontSize: 'clamp(36px, 4.5vw, 68px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {/* Cyan D + white remainder via a single text node with a
              hard-stop linear-gradient clipped to the text. The whole
              string lives in ONE span so the browser kerns "Dt..."
              naturally (the prior 3-span split broke kerning at the
              D/t boundary on some weights of General Sans). Stops at
              0.7em ≈ one capital-letter width; 0.05em transition keeps
              the boundary visually sharp. */}
          <span
            style={{
              // Stops tuned for Geist Sans: the capital D in Geist
              // sits narrower than General Sans's, so cyan ends at
              // 0.62em (was 0.7em for GS). 0.05em transition keeps
              // the boundary visually sharp — narrower than that and
              // the antialiased edge of the D bleeds white.
              background:
                'linear-gradient(90deg, #4dc4ff 0%, #4dc4ff 0.62em, #ffffff 0.67em, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {headlinePrefix}
            {headlineRest}
          </span>
        </h1>
        <p
          className="mt-5 font-body text-white/55"
          style={{ fontSize: '15px', lineHeight: 1.5 }}
        >
          {subhead}
        </p>
        <div className="mt-7">
          <Link
            href="/categories"
            className="group pointer-events-auto relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 font-body text-sm font-medium text-[#050308] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(77,196,255,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050308]"
            style={{
              background:
                'linear-gradient(115deg, #4dc4ff 0%, #6a8aff 35%, #a67aff 65%, #ec8ad9 100%)',
              backgroundSize: '200% 100%',
              animation: 'gradient-shift 12s ease-in-out infinite',
            }}
          >
            <span className="relative z-10">{primaryCTA}</span>
            <span aria-hidden="true" className="relative z-10">→</span>
          </Link>
        </div>
      </div>

      {/* Bottom-right scroll cue */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
        <p
          className="font-mono uppercase text-white/30"
          style={{ fontSize: '10px', letterSpacing: '0.25em' }}
        >
          {scrollCue}
          <span aria-hidden="true" className="ml-2 inline-block animate-bounce">
            ↓
          </span>
        </p>
      </div>
    </div>
  )
}
