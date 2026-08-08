import type { Metadata } from 'next'
import { imgOr } from '@/lib/img'
import { prepareCustomHtml } from '@/lib/custom-html'
import { CustomHtml } from '@/components/product/CustomHtml'
import { ProductGallery } from '@/components/product/ProductGallery'
import { StickyBuyBar } from '@/components/product/StickyBuyBar'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
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
import { getPublishedDesign } from '@/server/editor-page-data'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { BrandProductDetail } from '@/components/brand/BrandProductDetail'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { EditorialProductDetail } from '@/components/editorial/EditorialProductDetail'
import { toBrandProducts } from '@/server/brand-data'
import { TrackProductView } from '@/components/analytics/TrackView'
import {
  alternatesFor,
  openGraphFor,
  breadcrumbLd,
  productLd,
  jsonLdScript,
} from '@/lib/seo'

/**
 * ISR, not `force-dynamic`.
 *
 * This page reads nothing request-specific — no cookies, no session, no
 * searchParams — so rendering it per visitor meant every single visit paid a
 * round trip from the Vercel function to Postgres before a byte reached the
 * browser. Prerendered and revalidated, Vercel answers from the edge cache
 * closest to the visitor and the database is touched only when the content
 * actually changes. `revalidate` is the safety net; the real freshness comes
 * from revalidateStorefront() in every admin mutation (src/lib/revalidate.ts).
 *
 * setRequestLocale() is what MAKES this possible: without it next-intl reads
 * the locale from request headers, which silently opts the route back into
 * dynamic rendering.
 */
export const revalidate = 300

/**
 * Empty on purpose — this is what turns the route from "dynamic" into
 * "prerender on first request, then cache".
 *
 * Next 16 treats a dynamic segment with NO generateStaticParams as fully
 * dynamic: every visit re-renders. Declaring it (even with zero params) puts
 * the route in SSG mode with `dynamicParams: true`, so the first visitor to a
 * given slug pays the render and everyone after them is served from the route
 * cache until revalidateStorefront() or the revalidate window drops it.
 *
 * Returning [] rather than all 393 slugs keeps `next build` fast and avoids
 * prerendering 1179 pages (393 × 3 locales) that may never be visited.
 */
export function generateStaticParams(): { productSlug: string }[] {
  return []
}

interface ProductPageProps {
  params: Promise<{ locale: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale, productSlug } = await params
  setRequestLocale(locale)
  const product = await getProductBySlug(productSlug, locale as Locale)
  if (!product) notFound()

  // seoTitle / seoDescription are edited in admin → Produit → "SEO & avancé".
  // They were being written to the DB, round-tripped in the form, and read by
  // nothing — the <title> always used name/tagline. Now they win when set.
  const title = product.seoTitle?.trim() || product.name
  const description = product.seoDescription?.trim() || product.tagline
  const path = `/products/${product.slug}`

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor(locale as Locale, path, title, description),
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale: raw, productSlug } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const t = await getTranslations('showroom')
  const tSpec = await getTranslations('products.specLabels')

  const product = await getProductBySlug(productSlug, locale)
  if (!product) notFound()

  // Product + breadcrumb structured data. Rendered on every skin/template
  // branch below, because rich results shouldn't depend on which design is
  // published.
  //
  // Deliberately NO `offers` and NO `aggregateRating`:
  //  - there is no price column, and an Offer without a price is a Search
  //    Console error;
  //  - the star ratings on this site come from `seededRating`, which is
  //    synthetic placeholder data until the reviews API lands. Publishing
  //    invented review counts as structured data is a policy violation
  //    (fake review markup) and risks a manual action. Wire it here only
  //    once real reviews are persisted.
  const productJsonLd = jsonLdScript([
    productLd(locale, {
      slug: product.slug,
      name: product.name,
      description: product.seoDescription?.trim() || product.tagline,
      brandName: product.brand.name,
      categoryName: product.category.name,
      image: imgOr(product.cardImagePath),
    }),
    breadcrumbLd(locale, [
      { name: t('nav.home'), path: '' },
      { name: t('productsPage.breadcrumb'), path: '/products' },
      { name: product.name, path: `/products/${product.slug}` },
    ]),
  ])
  const jsonLd = (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd }}
      />
      <TrackProductView
        product={{
          slug: product.slug,
          name: product.name,
          brandName: product.brand.name,
          categoryName: product.category.name,
        }}
      />
    </>
  )

  // New "dtech Brand" design — brand-styled product page, same data.
  const design = await getPublishedDesign()
  if (design === 'brand') {
    const similarRaw = (
      await getProductsByCategory(product.category.slug, locale)
    ).filter((p) => p.slug !== product.slug)
    return (
      <BrandPageShell locale={locale}>
        {jsonLd}
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
            customHtml: product.customHtml
              ? prepareCustomHtml(product.customHtml)
              : '',
            image: imgOr(product.cardImagePath),
            specs: product.specs,
            images: (product.photoCarouselPaths ?? []).map(imgOr),
          }}
          similar={toBrandProducts(similarRaw)}
        />
      </BrandPageShell>
    )
  }

  // Éditorial design (skin #3) — editorial product page, same data.
  /* La fiche est rendue côté serveur et injectée telle quelle (`slots.body`) :
     l'auteur règle le MODÈLE « fiche produit » une fois, et il s'applique à
     toutes les fiches. Les mêmes données partent aussi en `data.product`, pour
     les sections du registre qui les lisent directement. */
  if (design === 'editorial') {
    const similarRaw = (
      await getProductsByCategory(product.category.slug, locale)
    ).filter((p) => p.slug !== product.slug)
    const detail = {
      slug: product.slug,
      name: product.name,
      brandName: product.brand.name,
      brandSlug: product.brand.slug,
      catName: product.category.name,
      catSlug: product.category.slug,
      tagline: product.tagline ?? '',
      description: product.description ?? '',
      customHtml: product.customHtml ? prepareCustomHtml(product.customHtml) : '',
      image: imgOr(product.cardImagePath),
      specs: product.specs,
      images: (product.photoCarouselPaths ?? []).map(imgOr),
    }
    const similar = toBrandProducts(similarRaw)
    const [doc, site] = await Promise.all([getEdDoc('product'), getEdSite()])
    return (
      <>
        {jsonLd}
        <EdSkinPage
          locale={locale}
          pageKey="product"
          doc={doc}
          site={site}
          data={{ product: { product: detail, similar } }}
          slots={{ body: <EditorialProductDetail product={detail} similar={similar} /> }}
        />
      </>
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

  return (
    <section className="sr-wrap" style={{ paddingTop: 26, paddingBottom: 60 }}>
      {jsonLd}
      <nav className="sr-crumbs sr-in" style={{ marginBottom: 20 }}>
        <Link href="/">{t('nav.home')}</Link>
        <span className="sep">/</span>
        <Link href="/products">{t('nav.catalog')}</Link>
        <span className="sep">/</span>
        <Link href={{ pathname: '/products', query: { category: product.category.slug } }}>
          {product.category.name}
        </Link>
        <span className="sep">/</span>
        <span className="cur">{product.name}</span>
      </nav>

      <div className="sr-in sr-pdgrid">
        {/* image + gallery thumbnails — sticky on desktop so the visual stays
            in view while the visitor reads specs/description */}
        <div className="sr-pdmedia">
          <ProductGallery
            images={[imgOr(product.cardImagePath), ...galleryImages.map(imgOr)]}
            alt={product.name}
          />
        </div>

        {/* info */}
        <div className="sr-pdinfo">
          <span className="sr-kicker sr-pdkicker">
            <Link href={{ pathname: '/products', query: { brand: product.brand.slug } }}>
              {product.brand.name}
            </Link>
            {' · '}
            <Link href={{ pathname: '/products', query: { category: product.category.slug } }}>
              {product.category.name}
            </Link>
          </span>
          <h1 className="sr-h1" style={{ fontSize: 'clamp(26px, 3.4vw, 42px)' }}>
            {product.name}
            <span className="acc">.</span>
          </h1>
          <p className="sr-sub" style={{ fontSize: 17 }}>{product.tagline}</p>

          {/* buy zone — availability + actions grouped in one card */}
          <div className="sr-buycard">
            <span className="sr-stock">{t('product.availability')}</span>
            <ProductActions
              slug={product.slug}
              name={product.name}
              brand={product.brand.name}
              image={imgOr(product.cardImagePath)}
            />
            <Link
              href={`/inquiry/${product.slug}`}
              className="sr-btn sr-btn-ghost"
              style={{ alignSelf: 'flex-start' }}
            >
              {t('product.inquire')} →
            </Link>
          </div>

          <div style={{ borderTop: '1px solid var(--sr-line)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paragraphs.map((p, i) => (
              <p key={i} className="sr-sub" style={{ maxWidth: 'none' }}>
                {p}
              </p>
            ))}
          </div>

        </div>
      </div>

      {/* ROUND 27 — the supplier "Code HTML" fiche is full width under the
          gallery, not inside the narrow info column. Same reasoning as the
          editorial skin: what gets pasted here is a wide marketing sheet
          (product shots + spec table), and a ~420px column turned the photos
          into thumbnails and overflowed the tables. */}
      {product.customHtml ? (
        <CustomHtml
          className="sr-customhtml sr-in sr-pdhtml"
          html={prepareCustomHtml(product.customHtml)}
        />
      ) : null}

      {specsEntries.length > 0 ? (
        <section style={{ marginTop: 52 }}>
          <h2 className="sr-h2" style={{ marginBottom: 18 }}>
            {specsTitle}
            <span className="acc">.</span>
          </h2>
          <div className="sr-spectable">
            {specsEntries.map(([key, value]) => (
              <div key={key} className="row">
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

      {similar.length > 0 ? (
        <section style={{ marginTop: 60 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 className="sr-h2">
              {t('product.similar')}
              <span className="acc">.</span>
            </h2>
            <Link
              href={{ pathname: '/products', query: { category: product.category.slug } }}
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

      <StickyBuyBar
        slug={product.slug}
        name={product.name}
        brand={product.brand.name}
        image={imgOr(product.cardImagePath)}
      />
    </section>
  )
}
