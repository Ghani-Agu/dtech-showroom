'use client'

/**
 * Brand-styled product detail page content (rendered inside BrandPageShell).
 * The original single-page design had no product page, so this is built from
 * the same brand tokens/classes (.pdp-* in brand-design.css).
 */

import { Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
import { useTranslations } from 'next-intl'
import { ReviewsSection } from '@/components/showroom/ReviewsSection'
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
  specs?: Record<string, string | number | string[]>
  images?: string[]
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
  const tSpec = useTranslations('products.specLabels')
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

        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="pdp-specs" style={{ marginTop: 44 }}>
            <h2 className="h-sec">
              {lang === 'ar' ? 'المواصفات التقنية' : lang === 'en' ? 'Specifications' : 'Fiche technique'}
            </h2>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r, 14px)', overflow: 'hidden', background: 'var(--bg)' }}>
              {Object.entries(product.specs).map(([k, v], i) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(130px, 220px) 1fr',
                    gap: 16,
                    padding: '13px 18px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <span style={{ color: 'var(--muted, #6a6a82)', textTransform: 'uppercase', fontSize: 12.5, letterSpacing: '0.04em', fontWeight: 600 }}>
                    {tSpec(k)}
                  </span>
                  <span style={{ color: 'var(--ink, #15152e)' }} dir="ltr">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.images && product.images.length > 0 && (
          <div className="pdp-images" style={{ marginTop: 44 }}>
            <h2 className="h-sec">{lang === 'ar' ? 'الصور' : 'Images'}</h2>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {product.images.map((src, i) => (
                <div
                  key={i}
                  style={{ aspectRatio: '4 / 3', borderRadius: 'var(--r, 14px)', overflow: 'hidden', border: '1px solid var(--line)', background: '#fff' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${product.name} ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>
        )}

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

        <ReviewsSection slug={product.slug} />
      </div>
    </section>
  )
}
