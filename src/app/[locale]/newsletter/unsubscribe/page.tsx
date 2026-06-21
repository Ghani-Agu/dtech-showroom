import type { Metadata } from 'next'
import { Link } from '@/i18n/routing'
import { unsubscribeByToken } from '@/server/newsletter-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Désinscription · Newsletter D-Tech',
  robots: { index: false, follow: false },
}

/**
 * One-click unsubscribe — required for any real email program (and for
 * Gmail / Outlook to consider us a non-spammer). The token IS the auth,
 * so this page can be reached straight from an email link without any
 * session.
 *
 * The action runs server-side on render. The result is rendered as a
 * friendly outcome. A "re-subscribe" link is offered in case the user
 * clicks by mistake.
 */
export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await unsubscribeByToken(token ?? '')

  const TITLES = {
    unsubscribed: 'Désinscription confirmée.',
    already: 'Vous étiez déjà désinscrit·e.',
    invalid: 'Lien invalide ou expiré.',
    error: 'Erreur technique.',
    subscribed: 'Désinscription confirmée.', // unreachable but keeps types happy
  } as const

  const LEADS = {
    unsubscribed:
      "Vous ne recevrez plus la newsletter D-Tech. Si c'était une erreur, vous pouvez vous réinscrire à tout moment depuis le pied de page du site.",
    already:
      "Aucune action nécessaire — votre adresse n'est plus sur la liste depuis un moment.",
    invalid:
      "Ce lien de désinscription n'est plus valide. Si vous continuez à recevoir des emails, contactez-nous directement.",
    error:
      "Quelque chose s'est mal passé. Réessayez dans quelques instants.",
    subscribed: '',
  } as const

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 md:px-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
        D-Tech · Newsletter
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
        {TITLES[result.state]}
      </h1>
      <p className="mt-4 font-body text-base leading-relaxed text-text-secondary">
        {LEADS[result.state]}
      </p>
      {result.email && result.ok && (
        <p className="mt-2 font-mono text-sm text-text-tertiary">
          {result.email}
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-body text-sm font-semibold text-surface-base shadow-sm transition-transform hover:-translate-y-px"
        >
          Retour à l’accueil →
        </Link>
        <Link
          href="/#newsletter"
          className="inline-flex items-center gap-2 rounded-full border border-surface-elevated px-5 py-3 font-body text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
        >
          Me réinscrire
        </Link>
      </div>
    </div>
  )
}
