import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { permanentRedirect } from '@/i18n/routing'
import { getBrandBySlug, getProductsByBrand, getAllBrands, getAllProducts } from '@/server/queries'
import { getPublishedDesign } from '@/server/editor-page-data'
import { getEdDoc, getEdSite } from '@/server/ed-doc'
import { EdSkinPage } from '@/components/editorial/ed-skin-page'
import { type EdBrandPageData } from '@/components/editorial/EdBrandPage'
import { edT, edTf, type EdLang } from '@/components/editorial/editorial-i18n'
import { brandStatus } from '@/components/editorial/ed-brand-facts'
import { imgOr } from '@/lib/img'
import { alternatesFor, openGraphFor, breadcrumbLd, itemListLd, jsonLdScript } from '@/lib/seo'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n/config'
import {
  parseProductQuery,
  productQueryToSearch,
  type RawSearchParams,
} from '@/lib/product-filters'

/**
 * ROUND 19 — the brand page is REAL again.
 *
 * Round 13 folded /brands/<slug> into /products?brand=<slug> because there was
 * only ever a grid to show. There is now a page worth landing on — brand
 * story, ranges, why-this-brand, the catalogue slice, figures, FAQ — so the
 * editorial skin renders it and only the OTHER two skins keep the 308.
 *
 * ISR with `generateStaticParams: []` — same trick as the product page: no
 * prerendering of 21 brands at build time, but the first request for each one
 * is cached from then on. See dtech-isr notes.
 */
export const revalidate = 300

export function generateStaticParams() {
  return []
}

interface Props {
  params: Promise<{ locale: string; brandSlug: string }>
  searchParams: Promise<RawSearchParams>
}

function lang(locale: string): EdLang {
  return locale === 'en' || locale === 'ar' ? locale : 'fr'
}

function loc(locale: string): Locale {
  return isValidLocale(locale) ? locale : defaultLocale
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brandSlug } = await params
  setRequestLocale(locale)
  const brand = await getBrandBySlug(brandSlug, loc(locale))
  if (!brand) return {}

  const l = lang(locale)
  const path = `/brands/${brandSlug}`
  const title = edTf(l, 'bp.h1', { brand: brand.name })
  // Prefer the brand's own positioning line; fall back to the description
  // rather than to the {count}-interpolated lede, which would render a gap
  // where the number should be (metadata has no product query to hand).
  const description = brand.statement || brand.description.slice(0, 300) || title

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: openGraphFor(loc(locale), path, title, description),
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, brandSlug } = await params
  setRequestLocale(locale)

  const design = await getPublishedDesign()

  // Classic + brand skins keep round 13's behaviour: one catalogue surface.
  if (design !== 'editorial') {
    const sp = await searchParams
    const search = productQueryToSearch(parseProductQuery(sp), { brand: brandSlug })
    const query = Object.fromEntries(new URLSearchParams(search))
    permanentRedirect({ href: { pathname: '/products', query }, locale })
  }

  const L = loc(locale)
  const [brand, products, allBrands, allProducts] = await Promise.all([
    getBrandBySlug(brandSlug, L),
    getProductsByBrand(brandSlug, L),
    getAllBrands(L),
    getAllProducts(L),
  ])

  /**
   * A missing brand is only a 404 if the DATABASE actually answered.
   *
   * `getBrandBySlug` funnels through `safe()`, which converts any DB error
   * into `null` — so during a Supabase blip every brand URL would look
   * deleted, and because this route is prerendered, Next would freeze that
   * 404 into the cache for the next five minutes. `allBrands` is the tell: if
   * it came back non-empty the connection is fine and the slug is genuinely
   * unknown. Otherwise throw, so Next keeps serving the last good render
   * instead of caching a lie. Same lesson as the empty-catalogue guard in
   * [locale]/page.tsx.
   */
  if (!brand) {
    if (allBrands.length === 0) {
      throw new Error(
        `Brand "${brandSlug}" unavailable and the brand list came back empty — treating as a database fault, not a 404.`
      )
    }
    notFound()
  }

  // Categories this brand actually sells in, biggest first, with the real
  // category hero image so the grid is photographic rather than a list.
  const catMap = new Map<string, { slug: string; name: string; count: number; img: string | null }>()
  for (const p of products) {
    const hit = catMap.get(p.category.slug)
    if (hit) hit.count += 1
    else
      catMap.set(p.category.slug, {
        slug: p.category.slug,
        name: p.category.name,
        count: 1,
        img: p.category.heroImagePath ?? null,
      })
  }
  const cats = [...catMap.values()].sort((a, b) => b.count - a.count)

  // Sibling brands, by catalogue weight, excluding this one.
  const countByBrand = new Map<string, number>()
  for (const p of allProducts) {
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }
  const others = allBrands
    .filter((b) => b.slug !== brandSlug && (countByBrand.get(b.slug) ?? 0) > 0)
    .map((b) => ({ slug: b.slug, name: b.name, count: countByBrand.get(b.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Featured first, then whatever else — capped so the page stays a teaser
  // for /products rather than a second, worse catalogue.
  const picked = [...products].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 8)

  const data: EdBrandPageData = {
    slug: brand.slug,
    name: brand.name,
    statement: brand.statement ?? '',
    description: brand.description ?? '',
    heroImage: brand.heroImagePath ? imgOr(brand.heroImagePath) : null,
    productCount: products.length,
    cats,
    products: picked.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      cat: p.category.slug,
      catName: p.category.name,
      spec: p.cardSpec ?? '',
      img: imgOr(p.cardImagePath),
      specs: p.specs,
      featured: p.featured,
    })),
    others,
  }

  const l = lang(locale)
  const jsonLd = (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbLd(locale, [
              { name: edT(l, 'bp.crumbTop'), path: '/brands' },
              { name: brand.name, path: `/brands/${brand.slug}` },
            ]),
            itemListLd(
              locale,
              picked.map((p) => ({ slug: p.slug, name: p.name }))
            ),
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [1, 2, 3, 4].map((n) => ({
                '@type': 'Question',
                name: edTf(l, `bp.q${n}`, { brand: brand.name }),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: edTf(l, `bp.a${n}`, { brand: brand.name }),
                },
              })),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Brand',
              name: brand.name,
              description: brand.statement || brand.description || undefined,
              // Honest: only claim the relationship the registry supports.
              slogan: edT(l, `bstat.${brandStatus(brand.slug)}`),
            },
          ]),
        }}
      />
    </>
  )

  /* Le MODÈLE « page marque » est réglé une fois dans l'éditeur et s'applique
     à toutes les marques : la page ne rend plus un composant figé mais le
     document `brand`, nourri des données de CETTE marque. */
  const [doc, site] = await Promise.all([getEdDoc('brand'), getEdSite()])

  return (
    <>
      {jsonLd}
      <EdSkinPage
        locale={locale}
        pageKey="brand"
        doc={doc}
        site={site}
        data={{ brand: data }}
      />
    </>
  )
}
