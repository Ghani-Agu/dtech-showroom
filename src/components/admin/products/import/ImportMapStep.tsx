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
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Étape 2 sur 3
        </p>
        <h2 className="font-display text-xl tracking-tight text-white">
          Associez vos colonnes
        </h2>
        <p className="mt-2 font-body text-sm text-[var(--admin-text-secondary)]">
          Les colonnes ont été détectées automatiquement quand c'était
          possible. Corrigez les associations erronées ou choisissez
          « Ignorer » pour passer une colonne.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-md border border-semantic-warning/30 bg-[var(--admin-amber)]/10 px-4 py-3">
          <p className="font-body text-sm text-[var(--admin-amber)]">
            Champs obligatoires manquants : {missingRequired.join(', ')}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_2fr] gap-4 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          <span>Colonne CSV</span>
          <span />
          <span>Correspond à</span>
        </div>

        {parsed.headers.map((header) => {
          const currentField = mapping.get(header) ?? null
          const sampleValue = parsed.rows[0]?.[header] ?? ''

          return (
            <div
              key={header}
              className="grid grid-cols-[1fr_auto_2fr] items-center gap-4 rounded-md bg-white/[0.04] px-4 py-3"
            >
              <div>
                <p className="font-body text-sm font-medium text-white">
                  {header}
                </p>
                {sampleValue && (
                  <p className="mt-1 truncate font-mono text-xs text-[var(--admin-text-tertiary)]">
                    ex. {sampleValue}
                  </p>
                )}
              </div>
              <ArrowRight size={14} className="text-[var(--admin-text-tertiary)]" />
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
                className="rounded-md bg-[var(--admin-canvas)] px-3 py-2 font-body text-sm text-white outline-none focus:ring-1 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <option value="">Ignorer cette colonne</option>
                <optgroup label="Obligatoires">
                  {required.map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Facultatifs">
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

      <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} />
          Retour
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={missingRequired.length > 0}
        >
          Vérifier {parsed.rows.length} lignes
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )
}
