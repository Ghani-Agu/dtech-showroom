import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  description?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, description, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-body text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none transition placeholder:text-text-muted focus:ring-1 focus:ring-accent',
            error &&
              'ring-1 ring-semantic-error focus:ring-semantic-error',
            className
          )}
          {...props}
        />
        {description && !error && (
          <p className="font-body text-sm text-text-muted">{description}</p>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-semantic-error">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
