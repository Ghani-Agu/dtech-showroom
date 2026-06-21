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
            className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full resize-y rounded-md bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 font-body text-base text-white outline-none transition placeholder:text-[var(--admin-text-tertiary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus:border-cyan-400/50',
            error &&
              'border-rose-500/50 focus:border-rose-500/50 focus-visible:ring-rose-500/50',
            className
          )}
          {...props}
        />
        {description && !error && (
          <p className="font-body text-sm text-[var(--admin-text-tertiary)]">
            {description}
          </p>
        )}
        {error && (
          <p role="alert" className="font-body text-sm text-rose-300">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
