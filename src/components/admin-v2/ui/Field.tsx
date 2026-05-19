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
        className="block font-body text-sm font-medium text-admin-text-primary"
      >
        {label}
        {required && (
          <span className="ml-1 text-admin-accent" aria-label="required">
            *
          </span>
        )}
      </label>
      {description && (
        <p className="font-body text-xs text-admin-text-muted leading-relaxed">
          {description}
        </p>
      )}
      <div className="relative">{children}</div>
      {error && (
        <p className="font-body text-xs text-admin-error">{error}</p>
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
          'font-body text-sm text-admin-text-primary placeholder:text-admin-text-muted',
          'transition-all duration-200',
          'focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error &&
            'border-admin-error focus:border-admin-error focus:ring-admin-error/20',
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
          'font-body text-sm text-admin-text-primary placeholder:text-admin-text-muted',
          'transition-all duration-200 resize-y',
          'focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error &&
            'border-admin-error focus:border-admin-error focus:ring-admin-error/20',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full h-11 pl-4 pr-10 rounded-lg appearance-none',
          'bg-admin-surface-elevated border border-admin-border',
          'font-body text-sm text-admin-text-primary',
          'transition-all duration-200',
          'focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20',
          'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%221.5%22><path d=%22M2.5 4.5l3.5 3.5 3.5-3.5%22/></svg>')] bg-no-repeat bg-[right_12px_center]",
          error &&
            'border-admin-error focus:border-admin-error focus:ring-admin-error/20',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'
