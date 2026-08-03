'use client'

/**
 * Éditorial product detail — rendered inside EditorialPageShell. Same data
 * contract as the Brand skin's detail (BrandProductDetailData), presented in
 * the editorial register: mono breadcrumbs, Comfortaa display title, spec
 * table as an editorial dl, shared gallery/reviews/sticky-buy components.
 */

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { useTranslations } from 'next-intl'
import { ReviewsSection } from '@/components/showroom/ReviewsSection'
import { ProductGallery } from '@/components/product/ProductGallery'
import { StickyBuyBar } from '@/components/product/StickyBuyBar'
import { CustomHtml } from '@/components/product/CustomHtml'
import { Carousel } from '@/components/showroom/Carousel'
import { useCart, WHATSAPP_NUMBER } from '@/lib/cart'
import type { BrandProduct } from '@/components/brand/brand-types'
import type { BrandProductDetailData } from '@/components/brand/BrandProductDetail'
import { EdCart, EdWhatsApp } from './editorial-icons'

const ADDED: Record<string, string> = {
  fr: 'Ajouté au panier',
  en: 'Added to cart',
  ar: 'أُضيف إلى السلة',
}
const SIMILAR: Record<string, string> = {
  fr: 'Produits similaires',
  en: 'Similar products',
  ar: 'منتجات مشابهة',
}
const PREV: Record<'fr' | 'en' | 'ar', string> = { fr: 'Précédent', en: 'Previous', ar: 'السابق' }
const NEXT: Record<'fr' | 'en' | 'ar', string> = { fr: 'Suivant', en: 'Next', ar: 'التالي' }

export function EditorialProductDetail({
  product,
  similar,
}: {
  product: BrandProductDetailData
  similar: BrandProduct[]
}) {
  const { t, lang } = useEditorial()
  const tSpec = useTranslations('products.specLabels')
  const add = useCart((s) => s.add)
  const openCart = useCart((s) => s.setOpen)
  const [added, setAdded] = useState(false)
  const paragraphs = product.description ? product.description.split('\n\n') : []
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Bonjour D-Tech, je suis intéressé par : ${product.name}`
  )}`

  const onAdd = () => {
    add({
      slug: product.slug,
      name: product.name,
      brand: product.brandName,
      image: product.image,
    })
    setAdded(true)
    window.setTimeout(() => {
      setAdded(false)
      openCart(true)
    }, 650)
  }

  const specLabel = (key: string): string => {
    try {
      const label = tSpec(key)
      return label.includes('specLabels') ? key : label
    } catch {
      return key
    }
  }

  return (
    <section className="ed-pdp">
      <div className="wrap">
        <nav className="ed-pdp-kicker" aria-label="Breadcrumb">
          <Link className="crumb" href="/products">
            {t('pdp.back')}
          </Link>
          <span className="crumb" aria-hidden>
            /
          </span>
          <Link className="crumb" href={{ pathname: '/products', query: { category: product.catSlug } }}>
            {product.catName}
          </Link>
          <span className="crumb" aria-hidden>
            /
          </span>
          <Link className="crumb" href={{ pathname: '/products', query: { brand: product.brandSlug } }}>
            {product.brandName}
          </Link>
        </nav>

        <div className="ed-pdp-grid" style={{ marginTop: 24 }}>
          <div className="ed-pdp-media">
            <ProductGallery images={[product.image, ...(product.images ?? [])]} alt={product.name} />
          </div>

          <div>
            <h1 className="ed-pdp-title">{product.name}</h1>
            {product.tagline ? <p className="ed-pdp-tag">{product.tagline}</p> : null}

            <div className="ed-pdp-ctas">
              <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener noreferrer">
                <EdWhatsApp size={16} /> {t('pdp.order')}
              </a>
              <button className="btn btn-k" onClick={onAdd}>
                <EdCart size={15} /> {added ? ADDED[lang] : t('pdp.addcart')}
              </button>
            </div>

            {paragraphs.length > 0 ? (
              <div className="ed-pdp-tag" style={{ marginTop: 26 }}>
                {paragraphs.map((p, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : '12px 0 0' }}>
                    {p}
                  </p>
                ))}
              </div>
            ) : null}

            {product.specs && Object.keys(product.specs).length > 0 ? (
              <dl className="ed-pdp-specs">
                <span className="eyebrow" style={{ display: 'block', padding: '18px 0 6px' }}>
                  {t('pdp.specs')}
                </span>
                {Object.entries(product.specs).map(([k, v]) => (
                  <div className="ed-spec-row" key={k}>
                    <dt>{specLabel(k)}</dt>
                    <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        {/* ROUND 27 — the admin-authored "Code HTML" fiche moved OUT of the
            right-hand column and under the whole grid.

            It used to render between the description and the spec table,
            i.e. inside a column that is 1fr of a `1.05fr 1fr` grid — about
            420px on a 1440px screen. What suppliers actually paste in there
            is a full marketing sheet: HP's fiche for the Series 7 Pro 732pk
            is a stack of wide product shots, an icon feature list and a spec
            table. Squeezed into 420px the photos scaled down to thumbnails,
            the table overflowed, and the buy CTAs were pushed thousands of
            pixels up the page away from the fiche they belong to.

            Full width under the gallery is where a fiche of that shape wants
            to be, and it is where every distributor site puts it. `.ed-pdp-
            html` (editorial-design.css) styles what comes out of the field:
            images are capped at 100% width, tables scroll rather than push
            the layout, and headings pick up the editorial type ramp.

            CustomHtml, not a bare dangerouslySetInnerHTML — scripts inserted
            through innerHTML never execute (see the file header, round 22). */}
        {product.customHtml ? (
          <section className="ed-pdp-html" aria-label={t('pdp.details')}>
            <span className="eyebrow">{t('pdp.details')}</span>
            <CustomHtml className="ed-pdp-htmlbody sr-customhtml" html={product.customHtml} />
          </section>
        ) : null}

        {similar.length > 0 ? (
          <div style={{ marginTop: 'clamp(40px, 6vw, 72px)' }}>
            <h2 className="h2" style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', marginBottom: 18 }}>
              {SIMILAR[lang]}
            </h2>
            <Carousel prevLabel={PREV[lang]} nextLabel={NEXT[lang]}>
              {similar.slice(0, 12).map((p) => (
                <article className="ed-card" key={p.slug} style={{ width: 260, flex: 'none' }}>
                  <Link href={`/products/${p.slug}`} className="ed-card-imgbox" aria-hidden tabIndex={-1}>
                    {p.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
                    ) : null}
                  </Link>
                  <div className="ed-card-body">
                    <span className="ed-card-kicker">
                      {p.brand} · {p.catName}
                    </span>
                    <Link href={`/products/${p.slug}`} className="ed-card-name">
                      {p.name}
                    </Link>
                    <span className="ed-card-spec">{p.spec}</span>
                  </div>
                </article>
              ))}
            </Carousel>
          </div>
        ) : null}

        <ReviewsSection slug={product.slug} />

        <StickyBuyBar
          slug={product.slug}
          name={product.name}
          brand={product.brandName}
          image={product.image}
        />
      </div>
    </section>
  )
}
