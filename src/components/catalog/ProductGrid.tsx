import { ProductCard } from './ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { ProductWithRelations } from '@/db/schema'

interface ProductGridProps {
  products: ProductWithRelations[]
  emptyMessage?: string
  priorityCount?: number
  className?: string
  // When set, propagates a data-scroll-* attribute onto each child card
  // so a parent choreography hook can target them.
  scrollMarker?: 'featured'
}

export function ProductGrid({
  products,
  emptyMessage = 'Nothing in this slice of the catalog yet.',
  priorityCount = 0,
  className,
  scrollMarker,
}: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5',
        className
      )}
    >
      {products.map((product, idx) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={idx < priorityCount}
          {...(scrollMarker === 'featured'
            ? { 'data-scroll-featured': true }
            : {})}
        />
      ))}
    </div>
  )
}
