import { SmartImage } from '@/components/ui/SmartImage'
import type { ProductWithRelations } from '@/db/schema'

interface FeaturedTierStageProps {
  product: ProductWithRelations
}

// TODO: Phase 5+ — replace with functional R3F orbit viewer
export function FeaturedTierStage({ product }: FeaturedTierStageProps) {
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
      <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full border border-text-muted/40 bg-surface-base/70 px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-muted backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Rotate to explore · coming Phase 5
      </div>
    </div>
  )
}
