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
            'Échec de l\'importation. Aucun produit n\'a été créé.'
        )
        return
      }

      toast.success(`${result.inserted} produits importés avec succès.`)
      onComplete()
      router.refresh()
      router.push('/admin/products')
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Étape 3 sur 3
        </p>
        <h2 className="font-display text-xl tracking-tight text-white">
          Vérifier et importer
        </h2>
        <p className="mt-2 font-body text-sm text-[var(--admin-text-secondary)]">
          Fichier : <span className="font-mono">{parsed.fileName}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Lignes au total" value={summary.total} />
        <Stat
          label="Valides"
          value={summary.valid}
          hint={
            summary.valid === summary.total ? 'Toutes les lignes sont bonnes' : undefined
          }
        />
        <Stat
          label="Erreurs"
          value={summary.invalid}
          hint={summary.invalid > 0 ? 'Corrigez le CSV et renvoyez-le' : 'Aucune'}
        />
      </div>

      {summary.invalid > 0 && (
        <div className="rounded-md border border-rose-500/30/30 bg-rose-500/10 px-4 py-3">
          <p className="font-body text-sm text-rose-300">
            <AlertCircle size={14} className="-mt-0.5 mr-1 inline" />
            {summary.invalid} ligne{summary.invalid > 1 ? 's' : ''} avec des
            erreurs de validation. Corrigez-les dans votre fichier puis
            renvoyez-le. Rien ne sera importé tant que toutes les lignes ne
            sont pas valides.
          </p>
        </div>
      )}

      {summary.valid > 0 && summary.invalid === 0 && (
        <div className="rounded-md border border-semantic-success/30 bg-emerald-500/10 px-4 py-3">
          <p className="font-body text-sm text-emerald-300">
            <CheckCircle2 size={14} className="-mt-0.5 mr-1 inline" />
            Les {summary.valid} lignes sont toutes valides. Prêt à importer.
          </p>
        </div>
      )}

      <div className="max-h-[500px] space-y-2 overflow-y-auto">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Ligne par ligne
        </p>
        {validations.map((v) => {
          const slug = v.mapped?.slug ?? '(sans slug)'
          const name = v.mapped?.name ?? '(sans nom)'
          const hasErrors = v.errors.length > 0

          return (
            <div
              key={v.rowIndex}
              className={
                hasErrors
                  ? 'rounded-md border border-rose-500/30/20 bg-rose-500/5 px-4 py-3'
                  : 'rounded-md bg-white/[0.04] px-4 py-3'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--admin-text-tertiary)]">
                      Ligne {v.rowIndex + 1}
                    </span>
                    <Badge variant={hasErrors ? 'error' : 'success'}>
                      {hasErrors
                        ? `${v.errors.length} erreur${v.errors.length > 1 ? 's' : ''}`
                        : 'OK'}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-body text-sm text-white">
                    {name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-[var(--admin-text-tertiary)]">
                    /{slug}
                  </p>
                </div>
              </div>
              {hasErrors && (
                <ul className="mt-3 space-y-1">
                  {v.errors.map((err, i) => (
                    <li
                      key={i}
                      className="font-body text-xs text-rose-300"
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

      <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeft size={14} />
          Retour aux colonnes
        </Button>
        <Button
          variant="primary"
          onClick={handleImport}
          disabled={!canImport}
          loading={isPending}
        >
          Importer {summary.valid} produit
          {summary.valid !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}
