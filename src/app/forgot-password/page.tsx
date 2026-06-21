import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe — Dtech',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <header className="mb-12 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-text-muted">
            Dtech Algérie · Admin
          </p>
          <h1 className="font-display text-4xl tracking-tight text-text-primary">
            Réinitialisation<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 font-body text-base text-text-secondary">
            Saisissez votre e-mail. Nous vous enverrons un lien de réinitialisation.
          </p>
        </header>

        <ForgotPasswordForm />
      </div>
    </main>
  )
}
