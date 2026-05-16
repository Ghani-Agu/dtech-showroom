'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-surface-base px-8 py-16">
      <div className="max-w-xl space-y-6 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Something went wrong
        </p>
        <h1 className="font-display text-5xl tracking-tight text-text-primary">
          We hit a wall<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-lg text-text-secondary">
          The search didn&apos;t run correctly. Try a different query or browse
          the catalog directly.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
          >
            Try again
          </button>
          <Link
            href="/categories"
            className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
          >
            Browse categories <span className="text-accent">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
