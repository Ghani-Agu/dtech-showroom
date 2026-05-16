import { Input } from '@/components/admin/ui/Input'
import { Textarea } from '@/components/admin/ui/Textarea'

interface BilingualFieldProps {
  label: string
  description?: string
  required?: boolean
  type: 'input' | 'textarea'
  rows?: number

  enValue: string
  frValue: string

  onEnChange: (value: string) => void
  onFrChange: (value: string) => void

  enError?: string
  frError?: string
}

export function BilingualField({
  label,
  description,
  required,
  type,
  rows,
  enValue,
  frValue,
  onEnChange,
  onFrChange,
  enError,
  frError,
}: BilingualFieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block font-body text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="ml-1 text-accent">*</span>}
        </label>
        {description && (
          <p className="mt-1 font-body text-xs text-text-muted">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            English{' '}
            {required && <span className="text-accent">(required)</span>}
          </p>
          {type === 'input' ? (
            <Input
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
            />
          ) : (
            <Textarea
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
              rows={rows}
            />
          )}
        </div>

        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Français <span className="text-text-muted">(optional)</span>
          </p>
          {type === 'input' ? (
            <Input
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              placeholder={
                enValue
                  ? `(falls back to: ${enValue.slice(0, 40)}...)`
                  : ''
              }
            />
          ) : (
            <Textarea
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              rows={rows}
              placeholder={
                enValue ? '(falls back to English when empty)' : ''
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
