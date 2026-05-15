import { cn } from '@/lib/utils'

type PlaceholderKind =
  | 'product-card'
  | 'product-hero'
  | 'brand-hero'
  | 'category-hero'

interface PlaceholderProps {
  kind: PlaceholderKind
  label?: string
  className?: string
}

const kindLabels: Record<PlaceholderKind, string> = {
  'product-card': 'PRODUCT · IMAGE PENDING',
  'product-hero': 'PRODUCT HERO · IMAGE PENDING',
  'brand-hero': 'BRAND HERO · IMAGE PENDING',
  'category-hero': 'CATEGORY HERO · IMAGE PENDING',
}

export function Placeholder({ kind, label, className }: PlaceholderProps) {
  const displayLabel = label ?? kindLabels[kind]
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-surface-elevated',
        className
      )}
      aria-hidden="true"
    >
      <span className="px-4 text-center font-mono text-xs uppercase tracking-wider text-text-muted">
        {displayLabel}
      </span>
    </div>
  )
}
