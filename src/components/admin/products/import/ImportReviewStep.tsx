'use client'

import { useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Stat } from '@/components/admin/ui/Stat'
import type { ImportableField } from '@/lib/import/auto-map'
import { validateRows } from '@/lib/import/validate-rows'
import { bulkInsertProducts } from '@/server/admin-import-actions'
import { toast } from '@/lib/toast'

interface ImportContext {
  existingSlugs: string[]
  brandSlugs: string[]
  categorySlugs: string[]
}

interface ImportReviewStepProps {
  parsed: {
    headers: string[]
    rows: Record<string, string>[]
    fileName: string
  }
  mapping: Map<string, ImportableField | null>
  context: ImportContext
  onBack: () => void
  onComplete: () => void
}

export function ImportReviewStep({
  parsed,
  mapping,
  context,
  onBack,
  onComplete,
}: ImportReviewStepProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { validations, summary } = useMemo(() => {
    return validateRows(
      parsed.rows,
      mapping,
      new Set(context.existingSlugs),
      new Set(context.brandSlugs),
      new Set(context.categorySlugs)
    )
  }, [parsed.rows, mapping, context])

  const canImport = summary.invalid === 0 && summary.valid > 0

  function handleImport() {
    if (!canImport) return

    const validRows = validations
      .filter((v) => v.errors.length === 0 && v.mapped !== null)
      .map((v) => v.mapped)
      .filter((m): m is NonNullable<typeof m> => m !== null)

    startTransition(async () => {
      const result = await bulkInsertProducts(validRows as never)

      if (!result.ok) {
        toast.error(
          result.errors[0]?.message ??
            'Import failed. No products were created.'
        )
        return
      }

      toast.success(`Imported ${result.inserted} products successfully.`)
      onComplete()
      router.refresh()
      router.push('/admin/products')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Step 3 of 3
        </p>
        <h2 className="font-display text-xl tracking-tight text-text-primary">
          Review and import
        </h2>
        <p className="mt-2 font-body text-sm text-text-secondary">
          File: <span className="font-mono">{parsed.fileName}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total rows" value={summary.total} />
        <Stat
          label="Valid"
          value={summary.valid}
          hint={
            summary.valid === summary.total ? 'All rows pass' : undefined
          }
        />
        <Stat
          label="Errors"
          value={summary.invalid}
          hint={summary.invalid > 0 ? 'Fix CSV and re-upload' : 'Clean'}
        />
      </div>

      {summary.invalid > 0 && (
        <div className="rounded-md border border-semantic-error/30 bg-semantic-error/10 px-4 py-3">
          <p className="font-body text-sm text-semantic-error">
            <AlertCircle size={14} className="-mt-0.5 mr-1 inline" />
            {summary.invalid} row{summary.invalid > 1 ? 's' : ''} have
            validation errors. Fix them in your file and re-upload.
            Nothing will be imported until all rows are valid.
          </p>
        </div>
      )}

      {summary.valid > 0 && summary.invalid === 0 && (
        <div className="rounded-md border border-semantic-success/30 bg-semantic-success/10 px-4 py-3">
          <p className="font-body text-sm text-semantic-success">
            <CheckCircle2 size={14} className="-mt-0.5 mr-1 inline" />
            All {summary.valid} rows are valid. Ready to import.
          </p>
        </div>
      )}

      <div className="max-h-[500px] space-y-2 overflow-y-auto">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Row-by-row
        </p>
        {validations.map((v) => {
          const slug = v.mapped?.slug ?? '(no slug)'
          const name = v.mapped?.name ?? '(no name)'
          const hasErrors = v.errors.length > 0

          return (
            <div
              key={v.rowIndex}
              className={
                hasErrors
                  ? 'rounded-md border border-semantic-error/20 bg-semantic-error/5 px-4 py-3'
                  : 'rounded-md bg-surface-elevated px-4 py-3'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">
                      Row {v.rowIndex + 1}
                    </span>
                    <Badge variant={hasErrors ? 'error' : 'success'}>
                      {hasErrors
                        ? `${v.errors.length} error${v.errors.length > 1 ? 's' : ''}`
                        : 'OK'}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-body text-sm text-text-primary">
                    {name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
                    /{slug}
                  </p>
                </div>
              </div>
              {hasErrors && (
                <ul className="mt-3 space-y-1">
                  {v.errors.map((err, i) => (
                    <li
                      key={i}
                      className="font-body text-xs text-semantic-error"
                    >
                      {err.field && (
                        <span className="font-mono">{err.field}: </span>
                      )}
                      {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-surface-overlay pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeft size={14} />
          Back to mapping
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={!canImport}
          loading={isPending}
        >
          Import {summary.valid} product
          {summary.valid !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}
