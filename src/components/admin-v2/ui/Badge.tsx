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
    'bg-admin-surface-elevated text-admin-text-secondary border-admin-border',
  success:
    'bg-admin-success-soft text-admin-success border-admin-success/30',
  warning:
    'bg-admin-warning-soft text-admin-warning border-admin-warning/30',
  error: 'bg-admin-error-soft text-admin-error border-admin-error/30',
  info: 'bg-admin-info-soft text-admin-info border-admin-info/30',
  accent: 'bg-admin-accent text-admin-surface-base border-transparent',
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
