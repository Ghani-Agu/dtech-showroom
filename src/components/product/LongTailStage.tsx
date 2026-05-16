'use client'

import { useState } from 'react'
import SmartImage from '@/components/ui/SmartImage'
import type { Product } from '@/db/schema'

interface LongTailStageProps {
  product: Product
}

export function LongTailStage({ product }: LongTailStageProps) {
  const photos =
    product.photoCarouselPaths.length > 0
      ? product.photoCarouselPaths
      : [product.heroImagePath ?? product.cardImagePath]

  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, photos.length - 1)
  const activePhoto = photos[safeIndex] ?? photos[0]

  return (
    <div className="space-y-4">
      {/* Main stage */}
      <div className="relative w-full overflow-hidden rounded-md bg-surface-void aspect-[4/3] md:aspect-video">
        <SmartImage
          src={activePhoto}
          alt={`${product.name} — view ${safeIndex + 1}`}
          fallbackVariant="product"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 60vw"
          priority
          className="object-cover"
        />
      </div>

      {/* Thumbnail strip — only if more than 1 photo */}
      {photos.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photoPath, index) => (
            <button
              key={`${photoPath}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-surface-void transition-opacity hover:opacity-100"
              style={{
                opacity: index === safeIndex ? 1 : 0.5,
                outline:
                  index === safeIndex
                    ? '1px solid var(--color-accent)'
                    : 'none',
                outlineOffset: '2px',
              }}
              aria-label={`Show view ${index + 1} of ${photos.length}`}
              aria-current={index === safeIndex ? 'true' : undefined}
            >
              <SmartImage
                src={photoPath}
                alt=""
                fallbackVariant="product"
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
