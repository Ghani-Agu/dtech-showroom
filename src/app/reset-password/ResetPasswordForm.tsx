'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface ResetPasswordFormProps {
  token: string
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setIsPending(true)

    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (result.error) {
      setError(
        result.error.message ??
          'Reset failed. The link may be expired or already used.'
      )
      setIsPending(false)
      return
    }

    setDone(true)
    setIsPending(false)
    setTimeout(() => router.push('/login'), 1500)
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <p className="font-body text-lg text-text-secondary">
          Password updated. Redirecting to sign in…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block font-body text-sm font-medium text-text-secondary"
        >
          New password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-surface-elevated px-4 py-3 font-body text-base text-text-primary outline-none transition placeholder:text-text-muted focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirm"
          className="block font-body text-sm font-medium text-text-secondary"
        >
          Confirm new password
        </label>
        <input
          type="password"
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {isPending ? 'Setting password…' : 'Set new password →'}
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
