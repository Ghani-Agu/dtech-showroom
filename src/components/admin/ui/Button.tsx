import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-body font-medium outline-none transition-colors focus:ring-1 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' && 'gap-1.5 px-3 py-1.5 text-sm',
          size === 'md' && 'gap-2 px-4 py-2 text-base',
          size === 'lg' && 'gap-2 px-6 py-3 text-base',
          variant === 'primary' &&
            'bg-accent text-surface-base hover:opacity-90',
          variant === 'secondary' &&
            'bg-surface-elevated text-text-primary hover:bg-surface-overlay',
          variant === 'tertiary' &&
            'bg-transparent px-2 text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent',
          variant === 'destructive' &&
            'bg-semantic-error/10 text-semantic-error hover:bg-semantic-error/20',
          variant === 'ghost' &&
            'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          className
        )}
        {...props}
      >
        {loading ? <span className="font-mono text-sm">...</span> : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
