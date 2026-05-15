'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import {
  fadeRise,
  staggerContainer,
  cinematicReveal,
  duration,
  gsapEasing,
} from '@/lib/animations'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export default function MotionVerificationPage() {
  const prefersReduced = useReducedMotion()
  const gsapBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReduced) return
    if (!gsapBoxRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(gsapBoxRef.current, {
        opacity: 0,
        y: 24,
        duration: duration.cinematic,
        ease: gsapEasing.outExpo,
        delay: 0.3,
      })
    }, gsapBoxRef)

    return () => ctx.revert()
  }, [prefersReduced])

  return (
    <main className="min-h-[300vh] bg-surface-base px-8 py-16 md:px-16">
      <div className="mx-auto max-w-5xl space-y-32">
        {/* Header */}
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            dtech-showroom · phase 1.2
          </p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-text-primary">
            Motion System<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-lg text-text-secondary">
            Verification page. Scroll to test Lenis. Reduced-motion preference:{' '}
            <span className="font-mono text-accent">
              {prefersReduced ? 'true (motion disabled)' : 'false (motion active)'}
            </span>
          </p>
        </header>

        {/* fadeRise — Framer */}
        <motion.section
          className="rounded-md bg-surface-elevated p-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-20%' }}
          variants={fadeRise}
        >
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            fadeRise · framer · {duration.slow}s · easing.out
          </p>
          <p className="mt-4 font-display text-4xl text-text-primary">
            The catalog leads at the site level.
          </p>
        </motion.section>

        {/* cinematicReveal — Framer */}
        <motion.section
          className="rounded-md bg-surface-elevated p-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-20%' }}
          variants={cinematicReveal}
        >
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            cinematicReveal · framer · {duration.cinematic}s · easing.outExpo
          </p>
          <p className="mt-4 font-display text-4xl text-text-primary">
            The product leads at its own page<span className="text-accent">.</span>
          </p>
        </motion.section>

        {/* staggerContainer demo — Framer */}
        <motion.section
          className="rounded-md bg-surface-elevated p-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-20%' }}
          variants={staggerContainer}
        >
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            staggerContainer · 60ms stagger between children
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <motion.div
                key={n}
                variants={fadeRise}
                className="aspect-square rounded bg-surface-overlay p-4"
              >
                <p className="font-mono text-xs text-text-muted">{n}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* GSAP demo */}
        <section className="rounded-md bg-surface-elevated p-8">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            gsap.from · cinematic duration · outExpo
          </p>
          <div
            ref={gsapBoxRef}
            className="mt-4 inline-block rounded bg-surface-overlay px-6 py-4"
          >
            <p className="font-display text-3xl text-text-primary">
              Driven by GSAP<span className="text-accent">.</span>
            </p>
          </div>
        </section>

        {/* Scroll proof */}
        <section className="rounded-md bg-surface-elevated p-8">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Scroll Test · The page is 300vh tall. Scroll smoothness proves Lenis is active.
          </p>
          <p className="mt-4 font-body text-base text-text-secondary">
            If scroll feels native (snappy, wheel-tick discrete), Lenis is NOT active.
            If scroll feels smooth, eased, and continuous, Lenis IS active.
            Toggle prefers-reduced-motion in your OS to see the difference.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-text-disabled/20 pt-8">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Motion system ready. Foundation complete.
          </p>
        </footer>
      </div>
    </main>
  )
}
