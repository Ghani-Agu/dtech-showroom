import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe — Dtech',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-4 font-display text-3xl text-text-primary">
            Lien de réinitialisation invalide<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary">
            Ce lien est manquant ou expiré. Demandez-en un nouveau depuis la
            page de connexion.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <header className="mb-12 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-text-muted">
            Dtech Algérie · Admin
          </p>
          <h1 className="font-display text-4xl tracking-tight text-text-primary">
            Nouveau mot de passe<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 font-body text-base text-text-secondary">
            Définissez un nouveau mot de passe. 8 caractères minimum.
          </p>
        </header>

        <ResetPasswordForm token={token} />
      </div>
    </main>
  )
}
