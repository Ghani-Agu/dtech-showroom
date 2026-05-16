'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import {
  IMPORTABLE_FIELDS,
  type ImportableField,
} from '@/lib/import/auto-map'

interface ImportMapStepProps {
  parsed: {
    headers: string[]
    rows: Record<string, string>[]
    fileName: string
  }
  mapping: Map<string, ImportableField | null>
  onChange: (mapping: Map<string, ImportableField | null>) => void
  onBack: () => void
  onNext: () => void
}

const requiredFields: ImportableField[] = [
  'slug',
  'name',
  'brandSlug',
  'categorySlug',
  'tier',
]

type FieldEntry = [ImportableField, (typeof IMPORTABLE_FIELDS)[ImportableField]]

export function ImportMapStep({
  parsed,
  mapping,
  onChange,
  onBack,
  onNext,
}: ImportMapStepProps) {
  const mappedFields = new Set(
    Array.from(mapping.values()).filter((v) => v !== null)
  )
  const missingRequired = requiredFields.filter((f) => !mappedFields.has(f))

  function updateMapping(header: string, field: ImportableField | null) {
    const newMapping = new Map(mapping)

    if (field !== null) {
      for (const [h, f] of newMapping) {
        if (h !== header && f === field) {
          newMapping.set(h, null)
        }
      }
    }

    newMapping.set(header, field)
    onChange(newMapping)
  }

  const entries = Object.entries(IMPORTABLE_FIELDS) as FieldEntry[]
  const required = entries.filter(([, f]) => f.required)
  const optional = entries.filter(([, f]) => !f.required)

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Step 2 of 3
        </p>
        <h2 className="font-display text-xl tracking-tight text-text-primary">
          Map your columns
        </h2>
        <p className="mt-2 font-body text-sm text-text-secondary">
          We auto-detected the columns where possible. Adjust any wrong
          mappings or set columns to &quot;Ignore&quot; to skip them.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-md border border-semantic-warning/30 bg-semantic-warning/10 px-4 py-3">
          <p className="font-body text-sm text-semantic-warning">
            Missing required fields: {missingRequired.join(', ')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_2fr] gap-4 px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          <span>CSV column</span>
          <span />
          <span>Maps to</span>
        </div>

        {parsed.headers.map((header) => {
          const currentField = mapping.get(header) ?? null
          const sampleValue = parsed.rows[0]?.[header] ?? ''

          return (
            <div
              key={header}
              className="grid grid-cols-[1fr_auto_2fr] items-center gap-4 rounded-md bg-surface-elevated px-4 py-3"
            >
              <div>
                <p className="font-body text-sm font-medium text-text-primary">
                  {header}
                </p>
                {sampleValue && (
                  <p className="mt-1 truncate font-mono text-xs text-text-muted">
                    e.g. {sampleValue}
                  </p>
                )}
              </div>
              <ArrowRight size={14} className="text-text-muted" />
              <select
                value={currentField ?? ''}
                onChange={(e) =>
                  updateMapping(
                    header,
                    e.target.value === ''
                      ? null
                      : (e.target.value as ImportableField)
                  )
                }
                className="rounded-md bg-surface-base px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Ignore this column</option>
                <optgroup label="Required">
                  {required.map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Optional">
                  {optional.map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-surface-overlay pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={missingRequired.length > 0}
        >
          Review {parsed.rows.length} rows
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )
}
