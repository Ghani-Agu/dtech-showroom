'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { submitInquiry, type InquiryActionResult } from '@/server/actions'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { cn } from '@/lib/utils'

interface InquiryFormProps {
  productSlug: string
}

const labelClasses = 'font-body text-sm font-medium text-text-secondary'
const fieldClasses =
  'w-full rounded-sm bg-surface-elevated px-4 py-3 font-body text-base text-text-primary placeholder:text-text-muted outline-none ring-0 focus:ring-1 focus:ring-accent'

function Submit() {
  const { pending } = useFormStatus()
  const t = useTranslations('inquiry')
  return (
    <SecondaryButton as="button" type="submit" disabled={pending}>
      {pending ? t('submitting') : `${t('submit')} →`}
    </SecondaryButton>
  )
}

export function InquiryForm({ productSlug }: InquiryFormProps) {
  const t = useTranslations('inquiry')
  const locale = useLocale()
  const [state, formAction] = useActionState<InquiryActionResult, FormData>(
    submitInquiry,
    null
  )

  // Phase 1 only surfaces top-level (_form) errors inline — typically the
  // rate-limit message. Per-field validation still relies on HTML5 native
  // validation; richer field-level error display lands in a later phase.
  const formError =
    state && state.ok === false ? state.errors?._form?.[0] : undefined

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot — off-screen field for bots. Real users can't see or
          reach it (tabIndex -1, aria-hidden, autoComplete off). If anything
          fills this field, the server-side action silently treats the
          submission as successful without writing to the DB. */}
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
        <label htmlFor="website">Website (leave empty)</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fullName" className={labelClasses}>
            {t('fullName')}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder={t('fullNamePlaceholder')}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className={labelClasses}>
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone" className={labelClasses}>
            {t('phone')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            minLength={6}
            maxLength={40}
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="company" className={labelClasses}>
            {t('company')}
          </label>
          <input
            id="company"
            name="company"
            type="text"
            maxLength={120}
            autoComplete="organization"
            placeholder={t('companyPlaceholder')}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className={labelClasses}>
          {t('message')}
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder={t('messagePlaceholder')}
          className={cn(fieldClasses, 'resize-y')}
        />
      </div>

      {formError ? (
        <p
          role="alert"
          className="font-body text-sm text-semantic-error"
        >
          {formError}
        </p>
      ) : null}

      <div className="pt-2">
        <Submit />
      </div>
    </form>
  )
}
