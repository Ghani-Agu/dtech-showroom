'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin-error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <AlertCircle
          size={48}
          className="mx-auto mb-4 text-rose-300"
          strokeWidth={1.5}
        />
        <h1 className="font-display text-2xl tracking-tight text-white">
          Une erreur est survenue<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
        <p className="mt-3 font-body text-base text-[var(--admin-text-secondary)]">
          Une erreur s'est produite lors du chargement de cette page.
          L'équipe a été prévenue.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--admin-text-tertiary)]">
            Identifiant d'erreur : {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft size={14} />
              Tableau de bord
            </Button>
          </Link>
          <Button variant="primary" onClick={reset}>
            <RefreshCw size={14} />
            Réessayer
          </Button>
        </div>
      </div>
    </div>
  )
}
