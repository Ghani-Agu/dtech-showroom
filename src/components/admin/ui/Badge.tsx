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
        variant === 'neutral' &&
          'bg-white/[0.08] text-[var(--admin-text-secondary)]',
        variant === 'accent' &&
          'bg-[var(--admin-cyan)]/15 text-[var(--admin-cyan)]',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-300',
        variant === 'warning' &&
          'bg-[var(--admin-amber)]/15 text-[var(--admin-amber)]',
        variant === 'error' && 'bg-rose-500/15 text-rose-300',
        className
      )}
      {...props}
    />
  )
}
