import { cn } from '@/lib/utils'

export type PillVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent'

interface PillProps {
  variant?: PillVariant
  withDot?: boolean
  children: React.ReactNode
  className?: string
}

const VARIANT_STYLES: Record<PillVariant, string> = {
  default:
    'bg-admin-surface-elevated text-admin-text-secondary border-admin-border',
  success: 'bg-admin-success-soft text-admin-success border-admin-success/30',
  warning: 'bg-admin-warning-soft text-admin-warning border-admin-warning/30',
  error: 'bg-admin-error-soft text-admin-error border-admin-error/30',
  info: 'bg-admin-info-soft text-admin-info border-admin-info/30',
  accent: 'bg-admin-accent-soft text-admin-accent border-admin-accent/30',
}

export function Pill({
  variant = 'default',
  withDot = true,
  children,
  className,
}: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-xs font-medium border',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {withDot && (
        <span
          className="size-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
