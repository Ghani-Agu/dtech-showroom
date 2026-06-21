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
            className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-md bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 font-body text-base text-white outline-none transition placeholder:text-[var(--admin-text-tertiary)]',
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
Input.displayName = 'Input'
