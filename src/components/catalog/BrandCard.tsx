import Link from 'next/link'
import { SmartImage } from '@/components/ui/SmartImage'
import type { Brand } from '@/db/schema'

interface BrandCardProps {
  brand: Brand
}

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group block rounded-md border border-transparent bg-surface-elevated transition-all duration-300 hover:-translate-y-1 hover:border-text-muted/20"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-md bg-surface-base">
        <SmartImage
          src={brand.heroImagePath}
          alt={brand.name}
          placeholderKind="brand-hero"
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-2 p-6">
        <h3 className="font-display text-2xl text-text-primary">{brand.name}</h3>
        <p className="font-body text-base text-text-secondary">{brand.statement}</p>
      </div>
    </Link>
  )
}
