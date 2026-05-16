'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: redirectTo,
    })

    if (result.error) {
      setError(
        result.error.message ??
          'Sign-in failed. Check your email and password.'
      )
      setIsPending(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block font-body text-sm font-medium text-text-secondary"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-surface-elevated px-4 py-3 font-body text-base text-text-primary outline-none transition placeholder:text-text-muted focus:ring-1 focus:ring-accent"
          placeholder="you@d-techalgerie.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block font-body text-sm font-medium text-text-secondary"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="font-body text-sm text-text-muted underline decoration-text-muted underline-offset-2 transition-colors hover:text-text-secondary hover:decoration-accent"
          >
            Forgot?
          </Link>
        </div>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-surface-elevated px-4 py-3 font-body text-base text-text-primary outline-none transition placeholder:text-text-muted focus:ring-1 focus:ring-accent"
        />
      </div>

      {error ? (
        <p role="alert" className="font-body text-sm text-semantic-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-surface-elevated px-6 py-3 font-body text-base font-medium text-text-primary transition hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  )
}

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  )
}
