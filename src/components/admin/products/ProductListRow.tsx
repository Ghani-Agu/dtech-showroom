import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/admin/ui/Badge'

interface ProductListRowProps {
  product: {
    id: string
    slug: string
    name: string
    nameFr: string | null
    tier: 'hero' | 'featured' | 'longtail'
    featured: boolean
    sortOrder: number
    cardImagePath: string | null
    archivedAt: Date | null
    brandName: string | null
    categoryName: string | null
  }
}

const tierLabel = {
  hero: 'Hero',
  featured: 'Featured',
  longtail: 'Long-tail',
}

const tierVariant = {
  hero: 'accent' as const,
  featured: 'neutral' as const,
  longtail: 'neutral' as const,
}

export function ProductListRow({ product }: ProductListRowProps) {
  const isArchived = product.archivedAt !== null
  const hasFrTranslation =
    product.nameFr !== null && product.nameFr.length > 0

  return (
    <li>
      <Link
        href={`/admin/products/${product.id}/edit`}
        className={
          isArchived
            ? 'block px-6 py-4 opacity-60 transition-colors hover:bg-surface-overlay/40'
            : 'block px-6 py-4 transition-colors hover:bg-surface-overlay/40'
        }
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-surface-elevated">
            {product.cardImagePath && (
              <Image
                src={product.cardImagePath}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-body text-base font-medium text-text-primary">
                {product.name}
              </p>
              <Badge variant={tierVariant[product.tier]}>
                {tierLabel[product.tier]}
              </Badge>
              {product.featured && (
                <Badge variant="accent">Featured</Badge>
              )}
              {!hasFrTranslation && (
                <Badge variant="warning">EN only</Badge>
              )}
              {isArchived && <Badge variant="neutral">Archived</Badge>}
            </div>
            <p className="mt-1 truncate font-body text-sm text-text-secondary">
              {product.brandName} · {product.categoryName} · /{product.slug}
            </p>
          </div>

          <div className="flex-shrink-0 text-right">
            <p className="font-mono text-xs text-text-muted">Sort</p>
            <p className="font-mono text-sm text-text-secondary">
              {product.sortOrder}
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}
