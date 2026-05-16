'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { autoMapHeaders, type ImportableField } from '@/lib/import/auto-map'
import { parseFile } from '@/lib/import/parse-file'
import { toast } from '@/lib/toast'

interface ImportUploadStepProps {
  onParsed: (
    parsed: {
      headers: string[]
      rows: Record<string, string>[]
      fileName: string
    },
    autoMap: Map<string, ImportableField | null>
  ) => void
}

export function ImportUploadStep({ onParsed }: ImportUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleFile(file: File) {
    startTransition(async () => {
      const result = await parseFile(file)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const autoMap = autoMapHeaders(result.headers)
      const matched = Array.from(autoMap.values()).filter(
        (v) => v !== null
      ).length

      toast.success(
        `Parsed ${result.rowCount} rows. Auto-matched ${matched} of ${result.headers.length} columns.`
      )

      onParsed(
        {
          headers: result.headers,
          rows: result.rows,
          fileName: file.name,
        },
        autoMap
      )
    })
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (isPending) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        className={
          isDragging
            ? 'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed border-accent bg-accent/5 py-16 transition-colors'
            : 'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed border-surface-overlay bg-surface-elevated py-16 transition-colors hover:border-text-muted'
        }
      >
        {isPending ? (
          <>
            <FileText size={48} className="animate-pulse text-accent" />
            <p className="font-body text-base text-text-primary">
              Parsing file...
            </p>
          </>
        ) : (
          <>
            <Upload size={48} className="text-text-muted" />
            <div className="text-center">
              <p className="font-body text-base text-text-primary">
                Drop a CSV or XLSX file here, or click to browse
              </p>
              <p className="mt-2 font-mono text-xs text-text-muted">
                CSV · TSV · XLSX · XLS · Max 5MB · Max 1000 rows
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div className="border-t border-surface-overlay pt-6">
        <h3 className="mb-2 font-body text-base font-medium text-text-primary">
          Need a template?
        </h3>
        <p className="mb-3 font-body text-sm text-text-secondary">
          Download a CSV template with all supported columns and a sample
          row.
        </p>
        <a
          href="/api/admin/import-template"
          download="dtech-product-import-template.csv"
        >
          <Button variant="secondary">
            <Download size={14} />
            Download template
          </Button>
        </a>
      </div>
    </div>
  )
}
