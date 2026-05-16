'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    // Always show success — don't leak whether the email exists.
    await authClient
      .requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      })
      .catch(() => {
        // Swallow errors; the success message is intentional regardless.
      })

    setSubmitted(true)
    setIsPending(false)
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <p className="font-body text-lg text-text-secondary">
          If an account exists for that email, a reset link has been sent.
        </p>
        <Link
          href="/login"
          className="inline-block font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
        >
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-surface-elevated px-6 py-3 font-body text-base font-medium text-text-primary transition hover:bg-surface-overlay disabled:opacity-50"
      >
        {isPending ? 'Sending…' : 'Send reset link →'}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="font-body text-sm text-text-muted underline decoration-text-muted underline-offset-2 hover:text-text-secondary hover:decoration-accent"
        >
          ← Back to sign in
        </Link>
      </div>
    </form>
  )
}
