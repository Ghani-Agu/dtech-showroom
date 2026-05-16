import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  description?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, error, label, description, id, rows = 4, ...props },
    ref
  ) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-body text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full resize-y rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none transition placeholder:text-text-muted focus:ring-1 focus:ring-accent',
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
Textarea.displayName = 'Textarea'
