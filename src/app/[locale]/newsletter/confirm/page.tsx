import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { confirmSubscriptionByToken } from '@/server/newsletter-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirmation · Newsletter D-Tech',
  robots: { index: false, follow: false },
}

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await confirmSubscriptionByToken(token ?? '')
  const t = await getTranslations('newsletter')

  const titles: Record<typeof result.state, string> = {
    subscribed: t('confirmedTitle') === 'newsletter.confirmedTitle' ? 'Inscription confirmée.' : t('confirmedTitle'),
    already: t('alreadyTitle') === 'newsletter.alreadyTitle' ? 'Déjà inscrit·e.' : t('alreadyTitle'),
    invalid: t('invalidTitle') === 'newsletter.invalidTitle' ? 'Lien invalide ou expiré.' : t('invalidTitle'),
    error: t('errorTitle') === 'newsletter.errorTitle' ? 'Erreur technique.' : t('errorTitle'),
    unsubscribed: 'Désinscription confirmée.',
  }
  const leads: Record<typeof result.state, string> = {
    subscribed:
      'Merci ! Vous recevrez maintenant les nouveautés D-Tech, les offres et les annonces directement dans votre boîte mail.',
    already:
      'Votre adresse était déjà confirmée — vous êtes bien sur la liste.',
    invalid:
      "Le lien de confirmation n’est plus valide. Recommencez l’inscription depuis le site.",
    error:
      "Quelque chose s’est mal passé. Réessayez dans quelques instants — si le problème persiste, contactez-nous.",
    unsubscribed: 'Votre adresse a été désinscrite.',
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 md:px-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
        D-Tech · Newsletter
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
        {titles[result.state]}
      </h1>
      <p className="mt-4 font-body text-base leading-relaxed text-text-secondary">
        {leads[result.state]}
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
          href="/products"
          className="inline-flex items-center gap-2 rounded-full border border-surface-elevated px-5 py-3 font-body text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
        >
          Voir les produits
        </Link>
      </div>
    </div>
  )
}
