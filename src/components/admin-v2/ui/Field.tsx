import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function Field({
  label,
  description,
  error,
  required,
  children,
}: FieldProps) {
  const id = useId()

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-body text-sm font-medium text-text-primary"
      >
        {label}
        {required && (
          <span className="ml-1 text-accent" aria-label="required">
            *
          </span>
        )}
      </label>
      {description && (
        <p className="font-body text-xs text-text-muted leading-relaxed">
          {description}
        </p>
      )}
      <div className="relative">{children}</div>
      {error && (
        <p className="font-body text-xs text-semantic-error">{error}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-11 px-4 rounded-lg',
          'bg-admin-surface-elevated border border-admin-border',
          'font-body text-sm text-text-primary placeholder:text-text-muted',
          'transition-all duration-200',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error &&
            'border-semantic-error focus:border-semantic-error focus:ring-semantic-error/20',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full min-h-[100px] px-4 py-3 rounded-lg',
          'bg-admin-surface-elevated border border-admin-border',
          'font-body text-sm text-text-primary placeholder:text-text-muted',
          'transition-all duration-200 resize-y',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error &&
            'border-semantic-error focus:border-semantic-error focus:ring-semantic-error/20',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
