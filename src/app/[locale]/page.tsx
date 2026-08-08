import type { Metadata } from 'next'
import { imgOr } from '@/lib/img'
import { getTranslations, setRequestLocale } from 'next-intl/server'
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
import { getHomeHero, getPublishedContent, getPublishedDesign } from '@/server/editor-page-data'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { BrandHome } from '@/components/brand/BrandHome'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { buildEditorialData } from '@/server/editorial-data'
import { buildBrandData } from '@/server/brand-data'
import { buildPartnerBand } from '@/server/partner-band'

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
 * The homepage had NO generateMetadata — it inherited the root layout's
 * hardcoded English title/description for all three locales, and emitted no
 * canonical or hreflang. The `metadata` i18n namespace already existed and
 * was read by nothing.
 */
interface LocaleParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
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

export default async function HomePage({ params }: LocaleParams) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const [design, heroConfig, contentOverrides, productsRaw, categoriesRaw, brandsRaw] =
    await Promise.all([
      getPublishedDesign(),
      getHomeHero(),
      getPublishedContent('home'),
      getAllProducts(locale),
      getAllCategories(locale),
      getAllBrands(locale),
    ])

  /**
   * Never let an empty catalogue be CACHED.
   *
   * Under ISR the homepage is prerendered once and served until it is
   * revalidated — so if the database is unreachable at build or regeneration
   * time, `safe()` hands back [] and a blank storefront gets frozen into the
   * route cache. Throwing instead is the correct failure: at build time it
   * fails the deploy loudly rather than shipping an empty shop, and during
   * regeneration Next keeps serving the LAST GOOD page and retries later.
   * Set ALLOW_EMPTY_CATALOGUE=1 for a deliberately empty first deploy.
   */
  if (
    productsRaw.length === 0 &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_EMPTY_CATALOGUE !== '1'
  ) {
    throw new Error(
      '[home] refusing to cache an empty catalogue — the database returned no ' +
        'products. Check DATABASE_URL / connectivity, then redeploy. ' +
        'Set ALLOW_EMPTY_CATALOGUE=1 to override.'
    )
  }

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
  /* La peau éditoriale ne rend plus un composant d'accueil figé : elle rend le
     DOCUMENT de la page « home », et le catalogue n'est plus qu'une donnée que
     ses sections consomment. `EdSkinPage` fournit lui-même le fournisseur, la
     barre de navigation, le <main> et le pied de page — d'où la disparition de
     `EditorialPageShell` ici. */
  if (design === 'editorial') {
    const edData = buildEditorialData(productsRaw, categoriesRaw, brandsRaw, heroConfig)
    const [doc, site] = await Promise.all([getEdDoc('home'), getEdSite()])
    return (
      <>
        {orgJsonLd}
        <EdSkinPage
          locale={locale}
          pageKey="home"
          doc={doc}
          site={site}
          data={{ home: edData }}
          /* Repris tel quel d'EditorialHome : l'en-tête préchargeait les
             visuels du hero et des cinq premières familles, et le pied de page
             listait les familles. Ces deux calculs vivaient dans le composant
             d'accueil ; l'enveloppe étant désormais commune, ils remontent
             ici et redescendent en props. */
          previews={[edData.heroImage, ...edData.cats.slice(0, 5).map((c) => c.img)]}
          catNames={edData.cats.map((c) => ({ id: c.id, name: c.name }))}
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
