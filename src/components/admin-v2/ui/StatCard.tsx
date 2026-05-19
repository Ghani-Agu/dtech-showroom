import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
  icon: LucideIcon
  iconColor?: 'accent' | 'success' | 'warning' | 'error' | 'info'
  href?: string
}

const ICON_COLORS: Record<NonNullable<StatCardProps['iconColor']>, string> = {
  accent: 'bg-admin-accent-soft text-admin-accent',
  success: 'bg-admin-success-soft text-admin-success',
  warning: 'bg-admin-warning-soft text-admin-warning',
  error: 'bg-admin-error-soft text-admin-error',
  info: 'bg-admin-info-soft text-admin-info',
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  iconColor = 'accent',
  href,
}: StatCardProps) {
  const inner = (
    <div className="group relative h-full bg-admin-surface-raised border border-admin-border rounded-2xl p-6 hover:border-admin-border-strong hover:bg-admin-surface-elevated transition-all">
      <div className="flex items-start justify-between mb-6">
        <div
          className={cn(
            'size-12 rounded-2xl flex items-center justify-center',
            ICON_COLORS[iconColor]
          )}
        >
          <Icon size={22} strokeWidth={1.75} />
        </div>
        {trend && (
          <span
            className={cn(
              'font-mono text-xs font-medium px-2 py-1 rounded-md',
              trend.direction === 'up' &&
                'bg-admin-success-soft text-admin-success',
              trend.direction === 'down' &&
                'bg-admin-error-soft text-admin-error',
              trend.direction === 'flat' &&
                'bg-admin-surface-elevated text-admin-text-muted'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <p className="font-display text-5xl font-medium text-admin-text-primary tracking-tight leading-none">
        {value}
      </p>
      <p className="font-body text-sm text-admin-text-secondary mt-2">
        {label}
      </p>
      {hint && (
        <p className="font-mono text-xs text-admin-text-muted mt-1 uppercase tracking-wider">
          {hint}
        </p>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    )
  }
  return inner
}
