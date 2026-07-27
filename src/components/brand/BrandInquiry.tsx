'use client'

/**
 * Brand-styled inquiry / quote page (rendered inside BrandPageShell).
 * Reuses the existing `submitInquiry` server action so submission behaves
 * exactly like the classic form — only the markup/styling is brand-native
 * (scoped .bform-* classes), avoiding any clash with the brand-root reset.
 */

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { submitInquiry, type InquiryActionResult } from '@/server/actions'
import { useBrand } from './brand-context'
import { Arrow } from './brand-icons'
import type { BrandLang } from './brand-i18n'

export interface BrandInquiryProduct {
  slug: string
  name: string
  brandName: string
  brandSlug: string
  catName: string
  image: string
  spec: string
}

const HOME_LABEL: Record<BrandLang, string> = { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('inquiry')
  return (
    <button type="submit" className="btn btn-teal btn-lg" disabled={pending} style={{ alignSelf: 'flex-start' }}>
      {pending ? t('submitting') : t('submit')}
      <Arrow s={13} />
    </button>
  )
}

export function BrandInquiry({ product }: { product: BrandInquiryProduct }) {
  const t = useTranslations('inquiry')
  const locale = useLocale()
  const { lang } = useBrand()
  const [state, formAction] = useActionState<InquiryActionResult, FormData>(submitInquiry, null)
  const formError = state && state.ok === false ? state.errors?._form?.[0] : undefined

  return (
    <section className="pdp">
      <div className="wrap">
        <nav className="pdp-crumbs">
          <Link href="/">{HOME_LABEL[lang]}</Link>
          <span className="sep">/</span>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
          <span className="sep">/</span>
          <span className="cur">{t('heading')}</span>
        </nav>

        <div className="sec-head" style={{ marginBottom: 18 }}>
          <div className="sh-l">
            <span className="eyebrow">{product.brandName} · {product.catName}</span>
            <h1 className="h-sec">{t('heading')} {product.name}</h1>
            <p className="lead">{t('subheading')}</p>
          </div>
        </div>

        <div className="pdp-product">
          <div className="thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.name} />
          </div>
          <div>
            <div className="pc">{product.brandName} · {product.catName}</div>
            <div className="pn">{product.name}</div>
            {product.spec && <div className="ps">{product.spec}</div>}
          </div>
        </div>

        <form action={formAction} className="bform">
          <input type="hidden" name="productSlug" value={product.slug} />
          <input type="hidden" name="locale" value={locale} />

          {/* Honeypot */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="website">Website (leave empty)</label>
            <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="bform-row">
            <div className="bform-field">
              <label htmlFor="fullName">{t('fullName')}</label>
              <input id="fullName" name="fullName" type="text" required minLength={2} maxLength={120} autoComplete="name" placeholder={t('fullNamePlaceholder')} />
            </div>
            <div className="bform-field">
              <label htmlFor="email">{t('email')}</label>
              <input id="email" name="email" type="email" required maxLength={255} autoComplete="email" placeholder={t('emailPlaceholder')} />
            </div>
          </div>

          <div className="bform-row">
            <div className="bform-field">
              <label htmlFor="phone">{t('phone')}</label>
              <input id="phone" name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" placeholder={t('phonePlaceholder')} />
            </div>
            <div className="bform-field">
              <label htmlFor="company">{t('company')}</label>
              <input id="company" name="company" type="text" maxLength={120} autoComplete="organization" placeholder={t('companyPlaceholder')} />
            </div>
          </div>

          <div className="bform-field">
            <label htmlFor="message">{t('message')}</label>
            <textarea id="message" name="message" required minLength={10} maxLength={5000} rows={5} placeholder={t('messagePlaceholder')} />
          </div>

          {formError ? <p role="alert" className="bform-err">{formError}</p> : null}

          <SubmitButton />
        </form>
      </div>
    </section>
  )
}
