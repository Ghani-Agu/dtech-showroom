import { Card } from '@/components/ui/Card'

type SpecValue = string | number | string[]

interface ProductSpecsProps {
  specs: Record<string, SpecValue>
}

function formatSpec(value: SpecValue): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function ProductSpecs({ specs }: ProductSpecsProps) {
  const entries = Object.entries(specs)
  if (entries.length === 0) return null

  return (
    <Card padding="lg">
      <dl className="divide-y divide-text-disabled/20">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-1 gap-1 py-4 md:grid-cols-[200px_1fr] md:gap-6"
          >
            <dt className="font-mono text-sm uppercase tracking-wide text-text-muted">
              {key}
            </dt>
            <dd className="font-mono text-base text-text-primary tabular-nums">
              {formatSpec(value)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
