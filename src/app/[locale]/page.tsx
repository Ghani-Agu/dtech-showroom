import { getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { BrandCard } from '@/components/catalog/BrandCard'
import { CategoryCard } from '@/components/catalog/CategoryCard'
import { ShaderHeroDynamic } from '@/components/three/ShaderHero/ShaderHeroDynamic'
import { HeroRevealOrchestrator } from '@/components/sections/HeroRevealOrchestrator'
import { HomepageChoreography } from '@/components/sections/HomepageChoreography'
import { type Locale } from '@/i18n/config'
import {
  getFeaturedProducts,
  getAllBrands,
  getAllCategories,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('home')
  const tNav = await getTranslations('navigation')
  const tCommon = await getTranslations('common')

  const [featured, brandList, categoryList] = await Promise.all([
    getFeaturedProducts(5, locale),
    getAllBrands(locale),
    getAllCategories(locale),
  ])

  // 3-line headline joined with spaces; visual line break comes from
  // typography at hero font size, not hard breaks (preserves the existing
  // single-Heading reveal choreography from Phase 5).
  const headline = `${t('headline')} ${t('headlineLine2')} ${t('headlineLine3')}`

  return (
    <>
      {/* Scroll + page-load choreography (pure orchestrators, no DOM). */}
      <HeroRevealOrchestrator />
      <HomepageChoreography />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden py-24 md:py-32 lg:py-40">
        <ShaderHeroDynamic />

        <div className="relative z-10 w-full">
          <Container>
            <div className="max-w-4xl space-y-6">
              <div data-hero-reveal>
                <EyebrowLabel>{t('eyebrow')}</EyebrowLabel>
              </div>
              <div data-hero-reveal>
                <Heading as="h1" size="hero" accentChar=".">
                  {headline}
                </Heading>
              </div>
              <p
                data-hero-reveal
                className="max-w-2xl font-body text-lg text-text-secondary md:text-xl"
              >
                {t('description')}
              </p>
              <div data-hero-reveal className="pt-2">
                <InquiryButton href="/categories">
                  {t('browseCatalog')}
                </InquiryButton>
              </div>
            </div>
          </Container>
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="space-y-10">
            <div className="space-y-2">
              <EyebrowLabel>FEATURED · IN THE GALLERY NOW</EyebrowLabel>
              <Heading as="h2" size="lg">
                {t('featuredTitle')}
              </Heading>
              <p className="font-body text-base text-text-secondary">
                {t('featuredSubtitle')}
              </p>
            </div>
            <ProductGrid
              products={featured}
              priorityCount={3}
              scrollMarker="featured"
            />
          </div>
        </Container>
      </section>

      {/* Brands */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="space-y-10">
            <div className="space-y-2">
              <EyebrowLabel>BRANDS · CARRIED BY DTECH</EyebrowLabel>
              <Heading as="h2" size="lg">
                {t('brandsTitle')}
              </Heading>
              <p className="font-body text-base text-text-secondary">
                {t('brandsSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {brandList.map((brand) => (
                <BrandCard key={brand.id} brand={brand} data-scroll-brand />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="space-y-10">
            <div className="space-y-2">
              <EyebrowLabel>CATEGORIES · THE CATALOG</EyebrowLabel>
              <Heading as="h2" size="lg">
                {t('categoriesTitle')}
              </Heading>
              <p className="font-body text-base text-text-secondary">
                {t('categoriesSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {categoryList.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  data-scroll-category
                />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="py-24 md:py-32">
        <Container>
          <div className="max-w-3xl space-y-6">
            <EyebrowLabel>LOOKING FOR SOMETHING SPECIFIC?</EyebrowLabel>
            <Heading as="h2" size="md" accentChar=".">
              {tCommon('search')}
            </Heading>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
              <InquiryButton href="/search">
                {tCommon('search')}
              </InquiryButton>
              <InquiryButton href="/about">{tNav('about')}</InquiryButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
