import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { BrandCard } from '@/components/catalog/BrandCard'
import { CategoryCard } from '@/components/catalog/CategoryCard'
import {
  getFeaturedProducts,
  getAllBrands,
  getAllCategories,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, brandList, categoryList] = await Promise.all([
    getFeaturedProducts(5),
    getAllBrands(),
    getAllCategories(),
  ])

  return (
    <>
      {/* Hero */}
      <section className="py-24 md:py-32 lg:py-40">
        <Container>
          <div className="max-w-4xl space-y-6">
            <EyebrowLabel>DTECH ALGÉRIE · EST. 2006</EyebrowLabel>
            <Heading as="h1" size="hero" accentChar=".">
              Hardware, presented properly
            </Heading>
            <p className="max-w-2xl font-body text-lg text-text-secondary md:text-xl">
              A curated catalog of laptops, networking, mobile, and accessories from
              HP, Dell, ASUS, TP-Link, and the in-house D-Tech line. Browse the
              showroom. Inquire when you find the machine.
            </p>
            <div className="pt-2">
              <InquiryButton href="/categories">Browse the catalog</InquiryButton>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="space-y-10">
            <div className="space-y-2">
              <EyebrowLabel>FEATURED · IN THE GALLERY NOW</EyebrowLabel>
              <Heading as="h2" size="lg">
                The current selection
              </Heading>
            </div>
            <ProductGrid products={featured} priorityCount={3} />
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
                Five lines, considered
              </Heading>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {brandList.map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
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
                Sorted by intent
              </Heading>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {categoryList.map((category) => (
                <CategoryCard key={category.id} category={category} />
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
              Search the catalog
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              Filter by brand, by category, or search by spec. If you don&apos;t see
              what you need, the inquiry form lives one click away.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
              <InquiryButton href="/search">Search the catalog</InquiryButton>
              <InquiryButton href="/about">About Dtech</InquiryButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
