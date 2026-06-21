import { cn } from '@/lib/utils'

export interface PulsingDotProps {
  className?: string
}

/**
 * 6px cyan dot with a pulsing ring (keyframe admin-pulse-dot in globals.css).
 * Used as the active-nav indicator on AdminSidebar items.
 */
export function PulsingDot({ className }: PulsingDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-1.5 rounded-full', className)}
      style={{
        background: 'var(--admin-cyan)',
        animation: 'admin-pulse-dot 2s ease-in-out infinite',
      }}
    />
  )
}
