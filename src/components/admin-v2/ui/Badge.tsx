import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default:
    'bg-admin-surface-elevated text-text-secondary border-admin-border',
  success:
    'bg-semantic-success/15 text-semantic-success border-semantic-success/30',
  warning:
    'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30',
  error: 'bg-semantic-error/15 text-semantic-error border-semantic-error/30',
  info: 'bg-accent/15 text-accent border-accent/30',
  accent: 'bg-accent text-surface-base border-transparent',
}

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
        'font-body text-xs font-medium border',
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
