'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isGooglePending, setIsGooglePending] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setIsGooglePending(true)
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: redirectTo,
      })
    } catch {
      setError('Échec de la connexion Google. Essayez avec votre e-mail et votre mot de passe.')
      setIsGooglePending(false)
    }
  }

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
          'Échec de la connexion. Vérifiez votre e-mail et votre mot de passe.'
      )
      setIsPending(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending}
        className="lg-google"
      >
        <GoogleIcon />
        {isGooglePending ? 'Redirection…' : 'Continuer avec Google'}
      </button>

      <div className="lg-divider">
        <span>ou</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
      <div className="lg-field">
        <label htmlFor="email" className="lg-label">
          E-mail
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="lg-input"
          placeholder="vous@d-techalgerie.com"
        />
      </div>

      <div className="lg-field">
        <div className="lg-row">
          <label htmlFor="password" className="lg-label">
            Mot de passe
          </label>
          <Link
            href="/forgot-password"
            className="lg-link"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="lg-input"
        />
      </div>

      {error ? (
        <p role="alert" className="lg-error">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="lg-submit">
        <span className="shine" aria-hidden="true" />
        {isPending ? 'Connexion…' : 'Se connecter →'}
      </button>
      </form>
    </div>
  )
}

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  )
}
