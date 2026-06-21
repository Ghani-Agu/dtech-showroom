import { cn } from '@/lib/utils'

export interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

/**
 * Section label — 16px / weight 500 / uppercase, tracked. Sits above a
 * GlassCard or grid.
 */
export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        'flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase',
        className
      )}
      style={{
        color: 'var(--admin-text-secondary)',
        letterSpacing: '2.5px',
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full"
        style={{
          background: 'var(--admin-cyan)',
          boxShadow: '0 0 8px color-mix(in oklab, var(--c-mint) 80%, transparent)',
        }}
      />
      {children}
    </h2>
  )
}
