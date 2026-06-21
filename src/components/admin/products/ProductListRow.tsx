import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/admin/ui/Badge'
import { TIER_STYLES, type Tier } from '@/components/admin/tierStyles'
import { RowActions } from './RowActions'

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

export function ProductListRow({ product }: ProductListRowProps) {
  const isArchived = product.archivedAt !== null
  const hasFrTranslation =
    product.nameFr !== null && product.nameFr.length > 0
  const tier = TIER_STYLES[product.tier as Tier]

  return (
    <li
      style={{
        borderBottom: '1px solid var(--admin-line)',
      }}
    >
      <div
        className={
          'flex items-center gap-3 py-4 pl-6 pr-4' +
          (isArchived ? ' opacity-60' : '')
        }
      >
      <Link
        href={`/admin/products/${product.id}/edit`}
        className="block min-w-0 flex-1 transition-[transform] duration-200 ease-[var(--admin-ease)] hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-white/[0.04]">
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
              <p className="truncate font-body text-base font-medium text-white">
                {product.name}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${tier.bgClass} ${tier.textClass}`}
                style={{ letterSpacing: '0.6px' }}
              >
                {tier.label}
              </span>
              {product.featured && <Badge variant="accent">★ Mis en avant</Badge>}
              {!hasFrTranslation && (
                <Badge variant="warning">EN seulement</Badge>
              )}
              {isArchived && <Badge variant="neutral">Masqué</Badge>}
            </div>
            <p className="mt-1 truncate font-body text-sm text-[var(--admin-text-secondary)]">
              {product.brandName} · {product.categoryName} · /{product.slug}
            </p>
          </div>

        </div>
      </Link>
      <RowActions
        productId={product.id}
        slug={product.slug}
        isArchived={isArchived}
      />
      </div>
    </li>
  )
}
