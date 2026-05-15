import { SmartImage } from '@/components/ui/SmartImage'
import type { ProductWithRelations } from '@/db/schema'

interface HeroTierStageProps {
  product: ProductWithRelations
}

// TODO: Phase 5+ — replace with cinematic R3F scene per v2 §6.1
export function HeroTierStage({ product }: HeroTierStageProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-surface-void aspect-[4/3] md:aspect-video">
      <SmartImage
        src={product.heroImagePath}
        alt={product.name}
        placeholderKind="product-hero"
        fill
        sizes="(min-width: 1024px) 80vw, 100vw"
        className="object-cover"
        priority
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.45)_100%)]"
      />
    </div>
  )
}
