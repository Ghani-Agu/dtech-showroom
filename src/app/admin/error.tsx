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
          className="mx-auto mb-4 text-semantic-error"
          strokeWidth={1.5}
        />
        <h1 className="font-display text-2xl tracking-tight text-text-primary">
          Something went wrong<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 font-body text-base text-text-secondary">
          An error occurred while loading this page. The team has been
          notified.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-text-muted">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft size={14} />
              Dashboard
            </Button>
          </Link>
          <Button variant="primary" onClick={reset}>
            <RefreshCw size={14} />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
