import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'error'
}

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs uppercase tracking-wider',
        variant === 'neutral' && 'bg-surface-elevated text-text-secondary',
        variant === 'accent' && 'bg-accent/10 text-accent',
        variant === 'success' &&
          'bg-semantic-success/10 text-semantic-success',
        variant === 'warning' &&
          'bg-semantic-warning/10 text-semantic-warning',
        variant === 'error' && 'bg-semantic-error/10 text-semantic-error',
        className
      )}
      {...props}
    />
  )
}
