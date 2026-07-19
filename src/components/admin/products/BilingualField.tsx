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
        <label className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]">
          {label}
          {required && <span className="ml-1 text-[var(--admin-cyan)]">*</span>}
        </label>
        {description && (
          <p className="mt-1 font-body text-xs text-[var(--admin-text-tertiary)]">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Anglais{' '}
            {required && <span className="text-[var(--admin-cyan)]">(requis)</span>}
          </p>
          {type === 'input' ? (
            <Input
              aria-label={`${label} (anglais)`}
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
            />
          ) : (
            <Textarea
              aria-label={`${label} (anglais)`}
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              error={enError}
              required={required}
              rows={rows}
            />
          )}
        </div>

        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Français <span className="text-[var(--admin-text-tertiary)]">(optionnel)</span>
          </p>
          {type === 'input' ? (
            <Input
              aria-label={`${label} (français)`}
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              placeholder={
                enValue
                  ? `(par défaut : ${enValue.slice(0, 40)}…)`
                  : ''
              }
            />
          ) : (
            <Textarea
              aria-label={`${label} (français)`}
              value={frValue}
              onChange={(e) => onFrChange(e.target.value)}
              error={frError}
              rows={rows}
              placeholder={
                enValue ? "(par défaut : l'anglais si vide)" : ''
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
