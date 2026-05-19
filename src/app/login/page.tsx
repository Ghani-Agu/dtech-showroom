import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Logo } from '@/components/brand/Logo'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in — Dtech',
  description: 'Sign in to manage the Dtech catalog.',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  // Redirect if already signed in.
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (session) {
    redirect('/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-surface-overlay bg-surface-base px-8 py-10">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" priority />
          </div>
          <header className="mb-10 text-center">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-text-muted">
              Dtech Algérie · Admin
            </p>
            <h1 className="font-display text-4xl tracking-tight text-text-primary">
              Sign in<span className="text-accent">.</span>
            </h1>
            <p className="mt-4 font-body text-base text-text-secondary">
              Manage the catalog, review inquiries, update products.
            </p>
          </header>

          <LoginForm />
        </div>
        <div className="breathing-bar" aria-hidden="true" />
      </div>
    </main>
  )
}
