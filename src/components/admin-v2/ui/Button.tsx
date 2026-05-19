'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-admin-accent text-admin-surface-base hover:brightness-110 active:brightness-95 disabled:bg-admin-surface-elevated disabled:text-admin-text-muted shadow-admin-sm',
  secondary:
    'bg-admin-surface-raised text-admin-text-primary border border-admin-border hover:bg-admin-surface-elevated hover:border-admin-border-strong',
  ghost:
    'bg-transparent text-admin-text-secondary hover:bg-admin-surface-raised hover:text-admin-text-primary',
  danger:
    'bg-admin-error-soft text-admin-error border border-admin-error/30 hover:bg-admin-error/25',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium font-body',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface-base',
          'disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="opacity-70">Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
