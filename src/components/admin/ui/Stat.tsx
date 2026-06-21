import { Card } from './Card'

interface StatProps {
  label: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: React.ReactNode
}

export function Stat({ label, value, hint, icon }: StatProps) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-start justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          {label}
        </p>
        {icon && (
          <span className="text-[var(--admin-text-tertiary)]">{icon}</span>
        )}
      </div>
      <p className="font-display text-3xl tracking-tight text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-2 font-body text-sm text-[var(--admin-text-secondary)]">
          {hint}
        </p>
      )}
    </Card>
  )
}
