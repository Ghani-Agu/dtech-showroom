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
          'inline-flex items-center justify-center rounded-full font-body font-semibold outline-none',
          'transition-[background,box-shadow,border-color,transform,color] duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]',
          'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
          size === 'sm' && 'gap-1.5 px-3.5 py-1.5 text-sm',
          size === 'md' && 'gap-2 px-5 py-2 text-[15px]',
          size === 'lg' && 'gap-2 px-7 py-3 text-base',
          variant === 'primary' &&
            'bg-gradient-to-br from-[var(--c-mint)] to-[color-mix(in_oklab,var(--c-mint)_80%,#000)] text-[var(--admin-on-accent)] shadow-[0_0_24px_-6px_color-mix(in_oklab,_var(--c-mint)_55%,_transparent)] hover:shadow-[0_0_38px_-6px_color-mix(in_oklab,_var(--c-mint)_80%,_transparent)] hover:-translate-y-px',
          variant === 'secondary' &&
            'glass-surface rounded-full text-white hover:border-[color-mix(in_oklab,_var(--c-mint)_45%,_transparent)] hover:bg-[color-mix(in_oklab,_var(--c-mint)_6%,_transparent)]',
          variant === 'tertiary' &&
            'bg-transparent px-2 text-white underline decoration-[var(--admin-text-tertiary)] underline-offset-4 hover:decoration-[var(--admin-cyan)]',
          variant === 'destructive' &&
            'bg-rose-500/12 text-rose-300 border border-rose-500/25 hover:bg-rose-500/85 hover:text-white hover:shadow-[0_0_24px_-6px_rgba(244,63,94,0.6)]',
          variant === 'ghost' &&
            'bg-transparent text-[var(--admin-text-secondary)] hover:bg-white/[0.04] hover:text-white',
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
