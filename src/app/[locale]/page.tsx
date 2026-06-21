import { imgOr } from '@/lib/img'
import { getLocale } from 'next-intl/server'
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
} from '@/server/queries'
import { getPublishedHome, getHomeHero, getPublishedContent } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { buildHomeData } from '@/server/template-data'
import type { PageDoc } from '@/components/admin/editor/types'

export const dynamic = 'force-dynamic'

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
  const [publishedHome, heroConfig, contentOverrides, productsRaw, categoriesRaw, brandsRaw] =
    await Promise.all([
      getPublishedHome(),
      getHomeHero(),
      getPublishedContent('home'),
      getAllProducts(locale),
      getAllCategories(locale),
      getAllBrands(locale),
    ])

  // A published visual-editor design overrides the default homepage — filled
  // with the real catalog so the rails/grid show live products.
  if (publishedHome) {
    return (
      <PublishedPage
        doc={publishedHome as unknown as PageDoc}
        data={buildHomeData(productsRaw, categoriesRaw, brandsRaw)}
      />
    )
  }

  const products: HomeProduct[] = productsRaw.map((p) => ({
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    cardSpec: p.cardSpec,
    cardImagePath: imgOr(p.cardImagePath),
    featured: p.featured,
  }))

  const countByCat = new Map<string, number>()
  const countByBrand = new Map<string, number>()
  for (const p of productsRaw) {
    countByCat.set(p.category.slug, (countByCat.get(p.category.slug) ?? 0) + 1)
    countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1)
  }

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
    <HomeShowcase products={products} categories={categories} brands={brands} heroConfig={heroConfig} content={contentOverrides} />
  )
}
