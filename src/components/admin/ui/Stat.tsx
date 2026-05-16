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
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {label}
        </p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <p className="font-display text-3xl tracking-tight text-text-primary">
        {value}
      </p>
      {hint && (
        <p className="mt-2 font-body text-sm text-text-secondary">{hint}</p>
      )}
    </Card>
  )
}
