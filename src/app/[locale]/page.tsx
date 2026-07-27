import type { Metadata } from 'next'
import { imgOr } from '@/lib/img'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  alternatesFor,
  openGraphFor,
  organizationLd,
  jsonLdScript,
} from '@/lib/seo'
import {
  HomeShowcase,
  type HomeBrand,
  type HomeCategory,
  type HomeProduct,
  type IconKind,
} from '@/components/home/HomeShowcase'
import { type Locale } from '@/i18n/config'
import {
  getAllBrands,
  getAllCategories,
  getAllProducts,
  pickFeatured,
} from '@/server/queries'
import { getPublishedHome, getHomeHero, getPublishedContent, getPublishedDesign } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildHomeData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'
import { BrandHome } from '@/components/brand/BrandHome'
import { EditorialHome } from '@/components/editorial/EditorialHome'
import { buildEditorialData } from '@/server/editorial-data'
import { buildBrandData } from '@/server/brand-data'
import { buildPartnerBand } from '@/server/partner-band'

export const dynamic = 'force-dynamic'

/**
 * The homepage had NO generateMetadata — it inherited the root layout's
 * hardcoded English title/description for all three locales, and emitted no
 * canonical or hreflang. The `metadata` i18n namespace already existed and
 * was read by nothing.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('metadata')
  const title = t('defaultTitle')
  const description = t('defaultDescription')
  return {
    title,
    description,
    alternates: alternatesFor(locale, ''),
    openGraph: openGraphFor(locale, '', title, description),
  }
}

/** Real-catalogue icon for each category family. */
const CATEGORY_ICON: Record<string, IconKind> = {
  laptops: 'laptop',
  desktops: 'desktop',
  'all-in-one': 'aio',
  monitors: 'desktop',
  tablets: 'tablet',
  printers: 'print',
  scanners: 'print',
  projectors: 'print',
  consumables: 'print',
  storage: 'parts',
  motherboards: 'parts',
  'graphics-cards': 'gaming',
  processors: 'parts',
  'power-supplies': 'parts',
  'pc-cases': 'parts',
  cooling: 'parts',
  ups: 'parts',
  networking: 'network',
  gaming: 'gaming',
  'power-banks': 'phone',
}

export default async function HomePage() {
  const locale = (await getLocale()) as Locale
  const [design, publishedHome, heroConfig, contentOverrides, productsRaw, categoriesRaw, brandsRaw] =
    await Promise.all([
      getPublishedDesign(),
      getPublishedHome(),
      getHomeHero(),
      getPublishedContent('home'),
      getAllProducts(locale),
      getAllCategories(locale),
      getAllBrands(locale),
    ])

  // Per-category / per-brand product counts (shared by both designs).
  const countByCat = new Map<string, number>()
  const countByBrand = new Map<string, number>()
  for (const p of productsRaw) {
    countByCat.set(p.category.slug, (countByCat.get(p.category.slug) ?? 0) + 1)
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }

  // HP partner spotlight — derived from the live catalogue (round 9). The
  // wiring was lost in the éditorial-port rewrite of this file, which is why
  // the band silently vanished from BOTH the classic and brand homepages.
  const partner = buildPartnerBand(productsRaw, brandsRaw)

  const orgJsonLd = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationLd()) }}
    />
  )

  // ── New "dtech Brand" design — same catalogue, different interface. ──
  if (design === 'brand') {
    return (
      <>
        {orgJsonLd}
        <BrandHome
          locale={locale}
          data={buildBrandData(productsRaw, categoriesRaw, brandsRaw, heroConfig)}
          partner={partner}
        />
      </>
    )
  }

  // ── Éditorial design (skin #3) — same catalogue, editorial interface. ──
  if (design === 'editorial') {
    return (
      <>
        {orgJsonLd}
        <EditorialHome
          locale={locale}
          data={buildEditorialData(productsRaw, categoriesRaw, brandsRaw, heroConfig)}
        />
      </>
    )
  }

  // A published visual-editor design overrides the default homepage — filled
  // with the real catalog so the rails/grid show live products.
  if (publishedHome) {
    return (
      <>
        {orgJsonLd}
        <PublishedPage
          doc={publishedHome as unknown as PageDoc}
          data={buildHomeData(productsRaw, categoriesRaw, brandsRaw)}
        />
      </>
    )
  }

  // Only the featured shortlist crosses the wire. Serialising all 393 rows
  // into the RSC payload on every request was the homepage's dominant cost;
  // the full catalogue now lives on /products with server-side paging.
  const products: HomeProduct[] = pickFeatured(productsRaw, 8).map((p) => ({
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    cardSpec: p.cardSpec,
    cardImagePath: imgOr(p.cardImagePath),
    featured: p.featured,
    specs: p.specs,
  }))

  const categories: HomeCategory[] = categoriesRaw.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: countByCat.get(c.slug) ?? 0,
    icon: CATEGORY_ICON[c.slug] ?? 'parts',
  }))

  const brands: HomeBrand[] = brandsRaw.map((b) => ({
    slug: b.slug,
    name: b.name,
    count: countByBrand.get(b.slug) ?? 0,
  }))

  return (
    <>
      {orgJsonLd}
      <HomeShowcase
        products={products}
        productCount={productsRaw.length}
        categories={categories}
        brands={brands}
        partner={partner}
        heroConfig={heroConfig}
        content={contentOverrides}
      />
    </>
  )
}
