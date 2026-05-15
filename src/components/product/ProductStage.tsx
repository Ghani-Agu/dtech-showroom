import { HeroTierStage } from './HeroTierStage'
import { FeaturedTierStage } from './FeaturedTierStage'
import { LongTailStage } from './LongTailStage'
import type { ProductWithRelations } from '@/db/schema'

interface ProductStageProps {
  product: ProductWithRelations
}

export function ProductStage({ product }: ProductStageProps) {
  switch (product.tier) {
    case 'hero':
      return <HeroTierStage product={product} />
    case 'featured':
      return <FeaturedTierStage product={product} />
    case 'longtail':
      return <LongTailStage product={product} />
  }
}
