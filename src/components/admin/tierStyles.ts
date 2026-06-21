export const TIER_STYLES: Record<
  'hero' | 'featured' | 'longtail',
  {
    label: string
    bgClass: string
    textClass: string
    dotClass: string
  }
> = {
  hero: {
    label: 'Vitrine',
    bgClass: 'bg-[var(--admin-cyan)]/10',
    textClass: 'text-[var(--admin-cyan)]',
    dotClass: 'bg-[var(--admin-cyan)]',
  },
  featured: {
    label: 'Vedette',
    bgClass: 'bg-[var(--admin-purple)]/10',
    textClass: 'text-[var(--admin-purple)]',
    dotClass: 'bg-[var(--admin-purple)]',
  },
  longtail: {
    label: 'Standard',
    bgClass: 'bg-[var(--admin-amber)]/10',
    textClass: 'text-[var(--admin-amber)]',
    dotClass: 'bg-[var(--admin-amber)]',
  },
} as const

export type Tier = keyof typeof TIER_STYLES
