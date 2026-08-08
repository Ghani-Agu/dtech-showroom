'use client'

/**
 * Éditorial inner-page bodies (the design is a one-page showcase; these
 * views extend its language to the site's real routes):
 *  - EdGridPage       → single category / single brand / search results
 *  - EdCategoriesPage → categories index
 *  - EdBrandsPage     → brands index
 *  - EdAbout          → « Pourquoi dtech » (bento + contact)
 *  - EdInquiry        → quote form (same submitInquiry server action)
 */

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { submitInquiry, type InquiryActionResult } from '@/server/actions'
import { useEditorial } from './editorial-context'
import { EdWhy, EdContact } from './EditorialSections'
import { EIcon, WaIcon, EdArrowRight } from './editorial-icons'
import { useCart, WHATSAPP_NUMBER } from '@/lib/cart'
import type { BrandProduct, BrandCategory, BrandBrandItem } from '@/components/brand/brand-types'
import type { BrandInquiryProduct } from '@/components/brand/BrandInquiry'

export function PageHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <header className="ed-pagehead wrap">
      <div className="rv" data-revealed style={{ display: 'grid', gap: 14 }}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="h2">{title}</h1>
        {sub ? <p className="lede">{sub}</p> : null}
      </div>
    </header>
  )
}

/* ── product card (inner grids; the home carousel shows categories) ── */

export function EdProductCard({ p }: { p: BrandProduct }) {
  const { t } = useEditorial()
  const add = useCart((s) => s.add)
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `${t('cat.wa')}${p.name}`
  )}`
  return (
    <article className="ed-card">
      <Link href={`/products/${p.slug}`} className="ed-card-imgbox" aria-hidden tabIndex={-1}>
        {p.img ? <Image src={p.img} alt="" fill sizes="(max-width: 640px) 90vw, 300px" /> : null}
      </Link>
      <div className="ed-card-body">
        <span className="ed-card-kicker">
          {p.brand} · {p.catName}
        </span>
        <Link href={`/products/${p.slug}`} className="ed-card-name">
          {p.name}
        </Link>
        <span className="ed-card-spec">{p.spec}</span>
        <div className="ed-card-foot">
          <Link className="ed-card-cta" href={`/products/${p.slug}`}>
            {t('card.view')}
          </Link>
          <button
            className="ed-card-wa"
            aria-label={t('aria.cart')}
            onClick={() => add({ slug: p.slug, name: p.name, brand: p.brand, image: p.img ?? '' })}
          >
            <EIcon n="cart" s={15} />
          </button>
          <a className="ed-card-wa" href={waHref} target="_blank" rel="noopener noreferrer" aria-label={t('aria.wa')}>
            <WaIcon s={15} />
          </a>
        </div>
      </div>
    </article>
  )
}

/* ── product grid page (category / brand / search) ── */

export function EdGridPage({
  eyebrow,
  title,
  sub,
  products,
  emptyLabel,
}: {
  eyebrow?: string
  title: string
  sub?: string
  products: BrandProduct[]
  emptyLabel?: string
}) {
  return (
    <div>
      <PageHead eyebrow={eyebrow} title={title} sub={sub} />
      <div className="wrap" style={{ paddingBottom: 'clamp(48px, 7vw, 96px)' }}>
        {products.length === 0 ? (
          <p className="lede">{emptyLabel ?? '—'}</p>
        ) : (
          <div className="ed-prod-grid">
            {products.map((p) => (
              <EdProductCard p={p} key={p.slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── categories index ── */

export function EdCategoriesPage({
  eyebrow,
  title,
  categories,
}: {
  eyebrow?: string
  title: string
  categories: BrandCategory[]
}) {
  const { t } = useEditorial()
  return (
    <div>
      <PageHead eyebrow={eyebrow} title={title} />
      <div className="wrap" style={{ paddingBottom: 'clamp(48px, 7vw, 96px)' }}>
        <div className="ed-fam-grid">
          {categories.map((c, i) => (
            <Link className="ed-fam-card" href={{ pathname: '/products', query: { category: c.id } }} key={c.id}>
              <span className="ed-fam-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="ed-fam-name">{c.name}</span>
              <span className="ed-fam-count">
                {c.count} {t('fam.products')}
              </span>
              <span className="ed-fam-go">
                <EdArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── brands index ── */

export function EdBrandsPage({
  eyebrow,
  title,
  brands,
}: {
  eyebrow?: string
  title: string
  brands: BrandBrandItem[]
}) {
  const { t } = useEditorial()
  return (
    <div>
      <PageHead eyebrow={eyebrow} title={title} />
      <div className="wrap" style={{ paddingBottom: 'clamp(48px, 7vw, 96px)' }}>
        <div className="ed-fam-grid">
          {brands.map((b, i) => (
            <Link className="ed-fam-card" href={{ pathname: '/products', query: { brand: b.id } }} key={b.id}>
              <span className="ed-fam-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="ed-fam-name">{b.name}</span>
              <span className="ed-fam-count">
                {b.count} {t('fam.products')}
              </span>
              <span className="ed-fam-go">
                <EdArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── about / pourquoi dtech ── */

export function EdAbout() {
  const { t } = useEditorial()
  return (
    <>
      <PageHead eyebrow={t('hero.tag')} title={t('nav.why')} sub={t('hero.lede')} />
      <EdWhy />
      <EdContact />
    </>
  )
}

/* ── inquiry / quote form ── */

function EdSubmit() {
  const { pending } = useFormStatus()
  const t = useTranslations('inquiry')
  return (
    <button type="submit" className="btn btn-k" disabled={pending} style={{ justifySelf: 'start' }}>
      {pending ? t('submitting') : t('submit')} <EdArrowRight size={14} />
    </button>
  )
}

export function EdInquiry({ product }: { product: BrandInquiryProduct }) {
  const t = useTranslations('inquiry')
  const locale = useLocale()
  const [state, formAction] = useActionState<InquiryActionResult, FormData>(submitInquiry, null)
  const formError = state && state.ok === false ? state.errors?._form?.[0] : undefined

  return (
    <div>
      <PageHead
        eyebrow={`${product.brandName} · ${product.catName}`}
        title={`${t('heading')} ${product.name}`}
        sub={t('subheading')}
      />
      <div className="wrap" style={{ paddingBottom: 'clamp(48px, 7vw, 96px)' }}>
        <div className="ed-contact-card" style={{ maxWidth: 760 }}>
          <form action={formAction} className="ed-form">
            <input type="hidden" name="productSlug" value={product.slug} />
            <input type="hidden" name="locale" value={locale} />
            {/* Honeypot */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
            >
              <label htmlFor="website">Website (leave empty)</label>
              <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="ed-form-row">
              <div className="ed-form-field">
                <label htmlFor="fullName">{t('fullName')}</label>
                <input id="fullName" name="fullName" type="text" required minLength={2} maxLength={120} autoComplete="name" placeholder={t('fullNamePlaceholder')} />
              </div>
              <div className="ed-form-field">
                <label htmlFor="email">{t('email')}</label>
                <input id="email" name="email" type="email" required maxLength={255} autoComplete="email" placeholder={t('emailPlaceholder')} />
              </div>
            </div>

            <div className="ed-form-row">
              <div className="ed-form-field">
                <label htmlFor="phone">{t('phone')}</label>
                <input id="phone" name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" placeholder={t('phonePlaceholder')} />
              </div>
              <div className="ed-form-field">
                <label htmlFor="company">{t('company')}</label>
                <input id="company" name="company" type="text" maxLength={120} autoComplete="organization" placeholder={t('companyPlaceholder')} />
              </div>
            </div>

            <div className="ed-form-field">
              <label htmlFor="message">{t('message')}</label>
              <textarea id="message" name="message" required minLength={10} maxLength={5000} rows={5} placeholder={t('messagePlaceholder')} />
            </div>

            {formError ? (
              <p role="alert" className="ed-form-err">
                {formError}
              </p>
            ) : null}

            <EdSubmit />
          </form>
        </div>
      </div>
    </div>
  )
}
