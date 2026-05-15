'use client'

import { useState, useMemo } from 'react'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'
import type { ProductWithRelations } from '@/db/schema'

interface LongTailStageProps {
  product: ProductWithRelations
}

// TODO: Phase 5+ — add 3-second cross-fade autoplay per v2 §5.8
export function LongTailStage({ product }: LongTailStageProps) {
  const images = useMemo(() => {
    const carousel = product.photoCarouselPaths ?? []
    if (carousel.length > 0) return carousel
    if (product.heroImagePath) return [product.heroImagePath]
    return [product.cardImagePath]
  }, [product])

  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  return (
    <div className="space-y-4">
      <div className="relative w-full overflow-hidden rounded-md bg-surface-void aspect-[4/3] md:aspect-video">
        <SmartImage
          src={current}
          alt={product.name}
          placeholderKind="product-hero"
          fill
          sizes="(min-width: 1024px) 80vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {images.map((path, idx) => (
            <button
              key={path + idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Show image ${idx + 1} of ${images.length}`}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                idx === active ? 'bg-accent' : 'bg-text-disabled hover:bg-text-muted'
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
