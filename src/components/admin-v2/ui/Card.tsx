import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, padded = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl bg-admin-surface-raised border border-admin-border',
          'transition-all duration-200',
          padded && 'p-6',
          hover &&
            'hover:bg-admin-surface-elevated hover:border-admin-border-strong cursor-pointer',
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 space-y-1', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-display text-xl font-medium text-admin-text-primary tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('font-body text-sm text-admin-text-secondary', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}
