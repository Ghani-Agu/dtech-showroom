import Link from 'next/link'
import { SmartImage } from '@/components/ui/SmartImage'
import type { Category } from '@/db/schema'

interface CategoryCardProps {
  category: Category
  'data-scroll-category'?: boolean
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.]*\./)
  return match ? match[0] : text
}

export function CategoryCard({ category, ...rest }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      data-scroll-category={rest['data-scroll-category']}
      className="group relative block overflow-hidden rounded-md border border-transparent bg-surface-elevated transition-all duration-300 hover:-translate-y-1 hover:border-text-muted/20"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-md bg-surface-base">
        <SmartImage
          src={category.heroImagePath}
          alt={category.name}
          fallbackVariant="category"
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-2 p-6">
        <h3 className="font-display text-2xl text-text-primary">{category.name}</h3>
        <p className="font-body text-base text-text-secondary">
          {firstSentence(category.description)}
        </p>
      </div>
      {/* Hairline accent — draws in left→right via HomepageChoreography */}
      <div
        className="card-accent absolute bottom-0 left-0 h-px w-full bg-accent"
        style={{ transformOrigin: 'left' }}
        aria-hidden="true"
      />
    </Link>
  )
}
