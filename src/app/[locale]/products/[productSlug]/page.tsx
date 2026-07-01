import type { Metadata } from 'next'
import Image from 'next/image'
import { imgOr } from '@/lib/img'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Carousel } from '@/components/showroom/Carousel'
import { ProductActions } from '@/components/showroom/ProductActions'
import { ReviewsSection } from '@/components/showroom/ReviewsSection'
import { ShowroomCard } from '@/components/showroom/ShowroomCard'
import { toExplorerProducts } from '@/lib/showroom-data'
import { type Locale } from '@/i18n/config'
import {
  getProductBySlug,
  getProductsByCategory,
} from '@/server/queries'
import { getPublishedPage, getPublishedDesign } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildProductData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { BrandProductDetail } from '@/components/brand/BrandProductDetail'
import { toBrandProducts } from '@/server/brand-data'

export const dynamic = 'force-dynamic'

interface ProductPageProps {
  params: Promise<{ locale: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale, productSlug } = await params
  const product = await getProductBySlug(productSlug, locale as Locale)
  if (!product) notFound()
  return { title: product.name, description: product.tagline }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productSlug } = await params
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('showroom')
  const tSpec = await getTranslations('products.specLabels')

  const product = await getProductBySlug(productSlug, locale)
  if (!product) notFound()

  // New "dtech Brand" design — brand-styled product page, same data.
  const design = await getPublishedDesign()
  if (design === 'brand') {
    const similarRaw = (
      await getProductsByCategory(product.category.slug, locale)
    ).filter((p) => p.slug !== product.slug)
    return (
      <BrandPageShell locale={locale}>
        <BrandProductDetail
          product={{
            slug: product.slug,
            name: product.name,
            brandName: product.brand.name,
            brandSlug: product.brand.slug,
            catName: product.category.name,
            catSlug: product.category.slug,
            tagline: product.tagline ?? '',
            description: product.description ?? '',
            image: imgOr(product.heroImagePath ?? product.cardImagePath),
            specs: product.specs,
            images: (product.photoCarouselPaths ?? []).map(imgOr),
          }}
          similar={toBrandProducts(similarRaw)}
        />
      </BrandPageShell>
    )
  }

  // A published "Modèle · Produit" overrides the default layout, filled with
  // this product's live data.
  const tmpl = await getPublishedPage('tmpl:product')
  if (tmpl) {
    const relatedRaw = (
      await getProductsByCategory(product.category.slug, locale)
    ).filter((rp) => rp.slug !== product.slug)
    return (
      <PublishedPage
        doc={tmpl as unknown as PageDoc}
        data={buildProductData(product, relatedRaw.slice(0, 12))}
      />
    )
  }

  const similar = toExplorerProducts(
    await getProductsByCategory(product.category.slug, locale)
  ).filter((p) => p.slug !== product.slug)

  const paragraphs = product.description.split('\n\n')
  const specsEntries = Object.entries(product.specs ?? {})
  const galleryImages = product.photoCarouselPaths ?? []
  const specsTitle =
    locale === 'ar' ? 'المواصفات التقنية' : locale === 'en' ? 'Specifications' : 'Fiche technique'
  const imagesTitle = locale === 'ar' ? 'الصور' : 'Images' 

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
      <nav className="sr-crumbs sr-in" style={{ marginBottom: 20 }}>
        <Link href="/">{t('nav.home')}</Link>
        <span className="sep">/</span>
        <Link href="/products">{t('nav.catalog')}</Link>
        <span className="sep">/</span>
        <Link href={`/categories/${product.category.slug}`}>
          {product.category.name}
        </Link>
        <span className="sep">/</span>
        <span className="cur">{product.name}</span>
      </nav>

      <div
        className="sr-in"
        style={{
          display: 'grid',
          gap: 34,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'start',
        }}
      >
        {/* image */}
        <div
          style={{
            position: 'relative',
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid var(--sr-line)',
            aspectRatio: '4 / 3',
            background: '#0a1322',
          }}
        >
          <Image
            src={imgOr(product.heroImagePath ?? product.cardImagePath)}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>

        {/* info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="sr-kicker">
            <Link
              href={`/brands/${product.brand.slug}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {product.brand.name}
            </Link>
            {' · '}
            <Link
              href={`/categories/${product.category.slug}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {product.category.name}
            </Link>
          </span>
          <h1 className="sr-h1" style={{ fontSize: 'clamp(26px, 3.4vw, 42px)' }}>
            {product.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ fontSize: 17 }}>{product.tagline}</p>
          <span
            className="sr-mono"
            style={{ color: 'var(--sr-cyan)', display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 13l5 5L20 6" />
            </svg>
            {t('product.availability')}
          </span>

          <ProductActions
            slug={product.slug}
            name={product.name}
            brand={product.brand.name}
            image={imgOr(product.cardImagePath)}
          />

          <div style={{ borderTop: '1px solid var(--sr-line)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paragraphs.map((p, i) => (
              <p key={i} className="sr-sub" style={{ maxWidth: 'none' }}>
                {p}
              </p>
            ))}
          </div>

          <Link
            href={`/inquiry/${product.slug}`}
            className="sr-btn sr-btn-ghost"
            style={{ alignSelf: 'flex-start' }}
          >
            {t('product.inquire')} →
          </Link>
        </div>
      </div>

      {specsEntries.length > 0 ? (
        <section style={{ marginTop: 52 }}>
          <h2 className="sr-h2" style={{ marginBottom: 18 }}>
            {specsTitle}
            <span className="acc">.</span>
          </h2>
          <div style={{ border: '1px solid var(--sr-line)', borderRadius: 18, overflow: 'hidden' }}>
            {specsEntries.map(([key, value], i) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 220px) 1fr',
                  gap: 16,
                  padding: '14px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--sr-line)',
                }}
              >
                <span
                  className="sr-mono"
                  style={{ color: 'var(--sr-mute)', textTransform: 'uppercase', fontSize: 13, letterSpacing: '.04em' }}
                >
                  {tSpec(key)}
                </span>
                <span className="sr-mono" style={{ color: 'var(--sr-text)' }} dir="ltr">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {galleryImages.length > 0 ? (
        <section style={{ marginTop: 52 }}>
          <h2 className="sr-h2" style={{ marginBottom: 18 }}>
            {imagesTitle}
            <span className="acc">.</span>
          </h2>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {galleryImages.map((src, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid var(--sr-line)',
                  background: '#fff',
                }}
              >
                <Image
                  src={imgOr(src)}
                  alt={`${product.name} ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 300px, 45vw"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section style={{ marginTop: 60 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 className="sr-h2">
              {t('product.similar')}
              <span className="acc">.</span>
            </h2>
            <Link
              href={`/categories/${product.category.slug}`}
              className="sr-mono"
              style={{ color: 'var(--sr-cyan)', textDecoration: 'none' }}
            >
              {t('product.backCatalog')} →
            </Link>
          </div>
          <Carousel prevLabel={t('filters.prev')} nextLabel={t('filters.next')}>
            {similar.slice(0, 12).map((p, i) => (
              <ShowroomCard key={p.slug} product={p} index={i} />
            ))}
          </Carousel>
        </section>
      ) : null}

      <ReviewsSection slug={product.slug} />
    </section>
  )
}
