import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the looping cyan border glow (hero card on dashboard). */
  borderGlow?: boolean
  /** Removes default padding (for list cards). */
  padded?: boolean
}

/**
 * Shared glass-surface card primitive. Default padding 24px. Hover lift via
 * pure CSS — no JS needed, so this stays a Server Component.
 */
export function GlassCard({
  borderGlow = false,
  padded = true,
  className,
  style,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      {...props}
      className={cn(
        'glass-surface relative',
        padded && 'p-6',
        className
      )}
      style={
        borderGlow
          ? {
              animation: 'admin-border-glow 4s ease-in-out infinite',
              ...style,
            }
          : style
      }
    >
      {children}
    </div>
  )
}
