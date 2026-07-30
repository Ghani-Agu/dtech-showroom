'use client'

/**
 * FooterNewsletter — compact, skin-agnostic newsletter capture used in the
 * three storefront footers (classic homepage, classic pages, brand skin).
 *
 * The full-page NewsletterSignup component was only mounted in the legacy
 * (unused) SiteFooter, which made the newsletter unreachable on the live
 * site — this brings signup back everywhere. Styling relies on the .sr-nl
 * block in showroom.css, whose tokens fall back gracefully in each skin.
 *
 * Same server action + honeypot + double-opt-in as the original form; the
 * confirmed subscribers flow into Brevo when a key is configured.
 */

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import {
  subscribeAction,
  type NewsletterActionResult,
} from '@/server/newsletter-actions'

function tf(
  t: ReturnType<typeof useTranslations>,
  key: string,
  fallback: string
): string {
  try {
    const v = t(key)
    return v && v !== `newsletter.${key}` ? v : fallback
  } catch {
    return fallback
  }
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="sr-nl-btn" disabled={pending}>
      {pending ? '…' : label}
    </button>
  )
}

export function FooterNewsletter({ source = 'footer' }: { source?: string }) {
  const t = useTranslations('newsletter')
  const locale = useLocale()
  const [state, formAction] = useActionState<
    NewsletterActionResult | null,
    FormData
  >(subscribeAction, null)

  const title = tf(t, 'headline', 'Restez au courant.')
  const placeholder = tf(t, 'emailPlaceholder', 'votre@email.com')
  const button = tf(t, 'submit', 'S’inscrire')

  let statusText: string | null = null
  let ok = false
  if (state) {
    ok = state.ok
    if (state.ok) {
      /* ROUND 24 — `saved_no_mail` must NOT read as "check your inbox": the
         address is stored but no email is coming. */
      statusText =
        state.status === 'already_subscribed'
          ? tf(t, 'successAlready', 'Vous êtes déjà inscrit·e — merci !')
          : state.status === 'saved_no_mail'
            ? tf(t, 'successNoMail', 'Inscription enregistrée. L’e-mail de confirmation n’a pas pu partir — nous vous confirmons manuellement, ou réessayez plus tard.')
            : tf(
                t,
                'successPending',
                'Vérifiez votre boîte mail — un message de confirmation vient d’arriver.'
              )
    } else {
      const code =
        state.errors?.email?.[0] ?? state.errors?._form?.[0] ?? 'generic'
      statusText =
        code === 'invalid_email'
          ? tf(t, 'errInvalid', 'Adresse e-mail invalide.')
          : code === 'rate_limited'
            ? tf(t, 'errRateLimited', 'Trop de tentatives. Réessayez dans une heure.')
            : tf(t, 'errGeneric', 'Une erreur s’est produite. Réessayez.')
    }
  }

  const hpId = `nl-hp-${source}`
  const emailId = `nl-email-${source}`

  return (
    <form action={formAction} className="sr-nl" noValidate>
      <p className="sr-nl-title">{title}</p>

      {/* Honeypot — hidden without an off-screen offset.

          `inset-inline-start: -9999px` (and plain `left: -9999px`) resolves to
          `right: -9999px` under RTL, which pushes the field 9 999px past the
          right edge and grows document scrollWidth to ~11 300px. That gave
          every Arabic page a huge phantom horizontal scrollbar. Clipping in
          place keeps the field in the DOM for bots with zero layout effect in
          either direction. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <label htmlFor={hpId}>Website</label>
        <input type="text" name="nl_ref_url" id={hpId} tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />

      <div className="sr-nl-row">
        <label htmlFor={emailId} className="sr-only">
          {placeholder}
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder={placeholder}
          className="sr-nl-input"
          dir="ltr"
        />
        <SubmitBtn label={button} />
      </div>

      {statusText ? (
        <p role="status" className={`sr-nl-msg ${ok ? 'is-ok' : 'is-err'}`}>
          {statusText}
        </p>
      ) : null}
    </form>
  )
}
