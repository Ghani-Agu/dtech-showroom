'use client'

/**
 * NewsletterSignup — public email-capture form.
 *
 * Drops into the storefront in two contexts:
 *   - <NewsletterSignup variant="footer" />      (used in SiteFooter)
 *   - <NewsletterSignup variant="inline" />      (any section CTA spot)
 *
 * Behaviour:
 *   - Native HTML5 email validation + a tighter server-side check.
 *   - Honeypot `website` field, off-screen, autocomplete off.
 *   - useActionState renders inline success / error messages.
 *   - Respects RTL by reading `useLocale()` and letting native dir do
 *     the heavy lifting (no flipped styles needed).
 *
 * Strings come from messages/<locale>.json under `newsletter`. If a key
 * is missing, we fall back to French inline defaults so the form still
 * works on day-one.
 */

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { subscribeAction, type NewsletterActionResult } from '@/server/newsletter-actions'

export interface NewsletterSignupProps {
  variant?: 'footer' | 'inline'
  /** Free-form analytics label written to subscribers.source. */
  source?: string
  className?: string
}

function FallbackT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const v = t(key)
    return v && v !== `newsletter.${key}` ? v : fallback
  } catch {
    return fallback
  }
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-5 py-3 font-body text-sm font-semibold text-surface-base shadow-sm transition-[transform,box-shadow] hover:translate-y-[-1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
      aria-disabled={pending}
    >
      {pending ? '…' : label}
    </button>
  )
}

export function NewsletterSignup({
  variant = 'footer',
  source,
  className,
}: NewsletterSignupProps) {
  const t = useTranslations('newsletter')
  const locale = useLocale()
  const [state, formAction] = useActionState<NewsletterActionResult | null, FormData>(
    subscribeAction,
    null
  )

  const headline = FallbackT(t, 'headline', 'Restez au courant.')
  const lede = FallbackT(
    t,
    'lede',
    'Inscrivez-vous à la newsletter — nouveautés, offres et annonces, directement par e-mail.'
  )
  const placeholder = FallbackT(t, 'emailPlaceholder', 'votre@email.com')
  const button = FallbackT(t, 'submit', "S’inscrire")
  const consentNote = FallbackT(
    t,
    'consent',
    'En vous inscrivant, vous acceptez de recevoir des e-mails de D-Tech. Désabonnement en un clic à tout moment.'
  )
  const successPending = FallbackT(
    t,
    'successPending',
    'Vérifiez votre boîte mail — un message de confirmation vient d’arriver.'
  )
  const successAlready = FallbackT(
    t,
    'successAlready',
    'Vous êtes déjà inscrit·e — merci !'
  )
  const successResent = FallbackT(
    t,
    'successResent',
    'Lien de confirmation renvoyé. Vérifiez votre boîte mail.'
  )
  const errInvalid = FallbackT(t, 'errInvalid', 'Adresse e-mail invalide.')
  const errRateLimited = FallbackT(
    t,
    'errRateLimited',
    'Trop de tentatives. Réessayez dans une heure.'
  )
  const errGeneric = FallbackT(t, 'errGeneric', 'Une erreur s’est produite. Réessayez.')

  // ── inline status messages ─────────────────────────────────────
  let statusText: string | null = null
  let statusTone: 'ok' | 'err' | null = null
  if (state) {
    if (state.ok) {
      statusTone = 'ok'
      if (state.status === 'pending') statusText = successPending
      else if (state.status === 'already_subscribed') statusText = successAlready
      else if (state.status === 'resent') statusText = successResent
      else statusText = successPending
    } else {
      statusTone = 'err'
      const code =
        state.errors?.email?.[0] ?? state.errors?._form?.[0] ?? 'generic'
      statusText =
        code === 'invalid_email'
          ? errInvalid
          : code === 'rate_limited'
            ? errRateLimited
            : errGeneric
    }
  }

  const isInline = variant === 'inline'
  const rootClasses = [
    'w-full',
    isInline ? 'max-w-2xl' : 'max-w-sm',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <form
      action={formAction}
      className={rootClasses}
      aria-labelledby="newsletter-headline"
      noValidate
    >
      <p
        id="newsletter-headline"
        className={`font-display font-semibold tracking-tight text-text-primary ${
          isInline ? 'text-2xl md:text-3xl' : 'text-base'
        }`}
      >
        {headline}
      </p>
      <p
        className={`mt-2 font-body text-sm leading-relaxed text-text-secondary ${
          isInline ? 'md:text-base' : ''
        }`}
      >
        {lede}
      </p>

      {/* Honeypot — bots fill this; humans never see it. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor={`nl-website-${variant}`}>Website</label>
        <input
          type="text"
          name="website"
          id={`nl-website-${variant}`}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source ?? variant} />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label htmlFor={`nl-email-${variant}`} className="sr-only">
          {placeholder}
        </label>
        <input
          type="email"
          name="email"
          id={`nl-email-${variant}`}
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-full border border-surface-elevated bg-surface-base px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/40"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        />
        <Submit label={button} />
      </div>

      {statusText && (
        <p
          role="status"
          className={`mt-3 font-body text-sm ${
            statusTone === 'ok' ? 'text-accent' : 'text-semantic-error'
          }`}
        >
          {statusText}
        </p>
      )}

      <p className="mt-3 font-body text-xs leading-relaxed text-text-muted">
        {consentNote}
      </p>
    </form>
  )
}
