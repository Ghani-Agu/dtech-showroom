import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="en">
      <body className="bg-surface-base text-text-primary">
        <div className="flex min-h-screen items-center justify-center px-8 py-16">
          <div className="max-w-xl space-y-6 text-center">
            <h1 className="font-display text-7xl font-medium leading-tight tracking-tight">
              404<span className="text-accent">.</span>
            </h1>
            <p className="font-body text-xl text-text-secondary">
              That page is not in the catalog.
            </p>
            <Link
              href="/en"
              className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent"
            >
              Back to home →
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
