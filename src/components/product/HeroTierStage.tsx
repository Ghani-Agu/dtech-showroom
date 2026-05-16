'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/db/schema'

interface HeroTierStageProps {
  product: Product
}

export function HeroTierStage({ product }: HeroTierStageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Subtle parallax: image translates -8% vertically across full scroll
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '-8%']
  )

  // Subtle scale: image starts at 1.04, settles to 1.0 as it enters view
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5],
    prefersReducedMotion ? [1, 1] : [1.04, 1.0]
  )

  const imagePath = product.heroImagePath ?? product.cardImagePath

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-md bg-surface-void aspect-[4/3] md:aspect-video"
    >
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <SmartImage
          src={imagePath}
          alt={`${product.name} — hero presentation`}
          fallbackVariant="product"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 80vw"
          priority
          className="object-cover"
        />
      </motion.div>

      {/* Subtle vignette for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />
    </div>
  )
}
