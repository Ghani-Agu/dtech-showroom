import { Link } from '@/i18n/routing'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'
import type { ProductWithRelations } from '@/db/schema'

interface ProductCardProps {
  product: ProductWithRelations
  priority?: boolean
  className?: string
  'data-scroll-featured'?: boolean
}

export function ProductCard({
  product,
  priority,
  className,
  ...rest
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      data-scroll-featured={rest['data-scroll-featured']}
      className={cn(
        'group block rounded-md border border-transparent bg-surface-elevated transition-all duration-300 hover:-translate-y-1 hover:border-text-muted/20',
        className
      )}
    >
      <div className="p-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface-base">
          <SmartImage
            src={product.cardImagePath}
            alt={product.name}
            fallbackVariant="product"
            fill
            sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 45vw"
            className="object-cover"
            priority={priority}
          />
        </div>
      </div>
      <div className="space-y-1 px-4 pb-5 pt-2">
        <h3 className="font-body text-lg font-medium text-text-primary">
          {product.name}
        </h3>
        <p className="font-body text-sm text-text-secondary">
          {product.brand.name}
        </p>
        <p className="font-mono text-xs text-text-muted">{product.cardSpec}</p>
      </div>
    </Link>
  )
}
