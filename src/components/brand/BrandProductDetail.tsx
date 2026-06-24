'use client'

/**
 * Brand-styled product detail page content (rendered inside BrandPageShell).
 * The original single-page design had no product page, so this is built from
 * the same brand tokens/classes (.pdp-* in brand-design.css).
 */

import { Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
import { ProductCard } from './BrandSections'
import { WhatsAppIcon, Arrow } from './brand-icons'
import { BRAND_WHATSAPP, type BrandProduct } from './brand-types'
import type { BrandLang } from './brand-i18n'

export interface BrandProductDetailData {
  slug: string
  name: string
  brandName: string
  brandSlug: string
  catName: string
  catSlug: string
  tagline: string
  description: string
  image: string
}

const HOME_LABEL: Record<BrandLang, string> = { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }
const SIMILAR_LABEL: Record<BrandLang, string> = {
  fr: 'Produits similaires',
  en: 'Similar products',
  ar: 'منتجات مشابهة',
}
const INQUIRE_LABEL: Record<BrandLang, string> = {
  fr: 'Demander un devis',
  en: 'Request a quote',
  ar: 'اطلب عرض سعر',
}

export function BrandProductDetail({
  product,
  similar,
}: {
  product: BrandProductDetailData
  similar: BrandProduct[]
}) {
  const { t, lang } = useBrand()
  const paragraphs = product.description ? product.description.split('\n\n') : []
  const waText = encodeURIComponent(`${t('card.waMsg')} ${product.name}`)

  return (
    <section className="pdp">
      <div className="wrap">
        <nav className="pdp-crumbs">
          <Link href="/">{HOME_LABEL[lang]}</Link>
          <span className="sep">/</span>
          <Link href="/products">{t('nav.catalogue')}</Link>
          <span className="sep">/</span>
          <Link href={`/categories/${product.catSlug}`}>{product.catName}</Link>
          <span className="sep">/</span>
          <span className="cur">{product.name}</span>
        </nav>

        <div className="pdp-grid">
          <div className="pdp-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.name} />
          </div>

          <div className="pdp-info">
            <span className="pdp-eyebrow">
              <Link href={`/brands/${product.brandSlug}`}>{product.brandName}</Link>
              {' · '}
              <Link href={`/categories/${product.catSlug}`}>{product.catName}</Link>
            </span>
            <h1>{product.name}</h1>
            {product.tagline && <p className="pdp-tagline">{product.tagline}</p>}
            <span className="pdp-stock">{t('catalog.stock')}</span>

            <div className="pdp-actions">
              <a
                className="pdp-wa"
                href={`https://wa.me/${BRAND_WHATSAPP}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon s={19} />
                {t('card.order')}
              </a>
              <Link className="btn btn-line" href={`/inquiry/${product.slug}`}>
                {INQUIRE_LABEL[lang]}
                <Arrow s={13} />
              </Link>
            </div>

            {paragraphs.length > 0 && (
              <div className="pdp-desc">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {similar.length > 0 && (
          <div className="pdp-similar">
            <h2 className="h-sec">{SIMILAR_LABEL[lang]}</h2>
            <div className="prod-grid">
              {similar.slice(0, 8).map((p) => (
                <ProductCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
