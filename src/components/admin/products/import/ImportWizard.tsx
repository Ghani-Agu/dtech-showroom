'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { ImportMapStep } from './ImportMapStep'
import { ImportReviewStep } from './ImportReviewStep'
import { ImportUploadStep } from './ImportUploadStep'
import type { ImportableField } from '@/lib/import/auto-map'

interface ImportContext {
  existingSlugs: string[]
  brandSlugs: string[]
  categorySlugs: string[]
}

interface ImportWizardProps {
  context: ImportContext
}

interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
}

type Step = 'upload' | 'map' | 'review'

export function ImportWizard({ context }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<
    Map<string, ImportableField | null>
  >(new Map())

  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: 'Upload' },
    { key: 'map', label: 'Map columns' },
    { key: 'review', label: 'Review & import' },
  ]

  return (
    <div className="space-y-6">
      <nav aria-label="Import progress">
        <ol className="flex items-center gap-4">
          {steps.map((s, idx) => {
            const isActive = s.key === step
            const isComplete =
              steps.findIndex((x) => x.key === step) > idx
            return (
              <li key={s.key} className="flex items-center gap-2">
                <div
                  className={
                    isComplete
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-accent text-surface-base'
                      : isActive
                        ? 'flex h-7 w-7 items-center justify-center rounded-full bg-surface-overlay text-text-primary ring-1 ring-accent'
                        : 'flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated text-text-muted'
                  }
                >
                  {isComplete ? (
                    <Check size={14} />
                  ) : (
                    <span className="font-mono text-xs">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={
                    isActive
                      ? 'font-body text-sm font-medium text-text-primary'
                      : 'font-body text-sm text-text-secondary'
                  }
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className="ml-2 h-px w-12 bg-surface-overlay" />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <Card>
        <CardContent className="p-6">
          {step === 'upload' && (
            <ImportUploadStep
              onParsed={(p, autoMap) => {
                setParsed(p)
                setMapping(autoMap)
                setStep('map')
              }}
            />
          )}
          {step === 'map' && parsed && (
            <ImportMapStep
              parsed={parsed}
              mapping={mapping}
              onChange={setMapping}
              onBack={() => setStep('upload')}
              onNext={() => setStep('review')}
            />
          )}
          {step === 'review' && parsed && (
            <ImportReviewStep
              parsed={parsed}
              mapping={mapping}
              context={context}
              onBack={() => setStep('map')}
              onComplete={() => {
                setParsed(null)
                setMapping(new Map())
                setStep('upload')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
