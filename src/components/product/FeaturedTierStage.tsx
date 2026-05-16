'use client'

import { useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/db/schema'

interface FeaturedTierStageProps {
  product: Product
}

export function FeaturedTierStage({ product }: FeaturedTierStageProps) {
  const photos =
    product.photoCarouselPaths.length > 0
      ? product.photoCarouselPaths
      : [product.heroImagePath ?? product.cardImagePath]

  const [activeIndex, setActiveIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const safeIndex = Math.min(activeIndex, photos.length - 1)

  return (
    <div className="relative w-full">
      {/* Stage */}
      <div className="relative w-full overflow-hidden rounded-md bg-surface-void aspect-[4/3] md:aspect-video">
        {photos.map((photoPath, index) => (
          <div
            key={`${photoPath}-${index}`}
            className="absolute inset-0 transition-opacity"
            style={{
              opacity: index === safeIndex ? 1 : 0,
              transitionDuration: prefersReducedMotion ? '0ms' : '480ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-hidden={index !== safeIndex}
          >
            <SmartImage
              src={photoPath}
              alt={`${product.name} — view ${index + 1}`}
              fallbackVariant="product"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 70vw"
              priority={index === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators — only show if more than 1 photo */}
      {photos.length > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-6">
          {photos.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative h-2 w-2"
              aria-label={`Show view ${index + 1} of ${photos.length}`}
              aria-current={index === safeIndex ? 'true' : undefined}
            >
              <span
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  background:
                    index === safeIndex
                      ? 'var(--color-accent)'
                      : 'var(--color-text-muted)',
                  opacity: index === safeIndex ? 1 : 0.4,
                  transform: index === safeIndex ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              {/* Larger hit area for accessibility — 24px tap target */}
              <span className="absolute -inset-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
