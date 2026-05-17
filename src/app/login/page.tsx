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
        <div
          className="conic-border-wrapper relative rounded-lg p-px"
          style={{
            background:
              'conic-gradient(from var(--gradient-angle), oklch(0.74 0.14 215) 0deg, oklch(0.45 0.10 215) 90deg, oklch(0.28 0.06 215) 180deg, oklch(0.45 0.10 215) 270deg, oklch(0.74 0.14 215) 360deg)',
            animation:
              'conic-rotate 8s linear infinite, conic-breathe 4s ease-in-out infinite',
          }}
        >
          <div className="relative rounded-lg bg-surface-base px-8 py-10">
            <div className="mb-8 flex justify-center">
              <Logo size="md" priority />
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
        </div>
      </div>
    </main>
  )
}
