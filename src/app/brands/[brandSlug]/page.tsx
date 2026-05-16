import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SmartImage } from '@/components/ui/SmartImage'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { getBrandBySlug, getProductsByBrand } from '@/server/queries'

export const dynamic = 'force-dynamic'

interface BrandPageProps {
  params: Promise<{ brandSlug: string }>
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { brandSlug } = await params
  const brand = await getBrandBySlug(brandSlug)
  if (!brand) return { title: 'Brand not found' }
  return {
    title: brand.name,
    description: brand.description,
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brandSlug } = await params
  const brand = await getBrandBySlug(brandSlug)
  if (!brand) notFound()

  const productList = await getProductsByBrand(brandSlug)
  const featured = productList.filter((p) => p.featured)
  const rest = productList.filter((p) => !p.featured)

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-16">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Brands', href: '/brands' },
              { label: brand.name },
            ]}
          />

          {/* Brand hero */}
          <div className="space-y-8">
            <div className="relative aspect-[16/7] w-full overflow-hidden rounded-md bg-surface-elevated">
              <SmartImage
                src={brand.heroImagePath}
                alt={brand.name}
                fallbackVariant="brand"
                fill
                sizes="(min-width: 1024px) 80vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="max-w-3xl space-y-4">
              <EyebrowLabel>BRAND</EyebrowLabel>
              <Heading as="h1" size="hero">
                {brand.name}
              </Heading>
              <p className="font-display text-2xl text-text-secondary md:text-3xl">
                {brand.statement}
              </p>
              <p className="font-body text-lg text-text-secondary">
                {brand.description}
              </p>
            </div>
          </div>

          {/* Featured */}
          {featured.length > 0 ? (
            <div className="space-y-8">
              <EyebrowLabel>FEATURED · {brand.name.toUpperCase()}</EyebrowLabel>
              <ProductGrid products={featured} priorityCount={2} />
            </div>
          ) : null}

          {/* All products */}
          <div className="space-y-8">
            <EyebrowLabel>
              ALL {brand.name.toUpperCase()} PRODUCTS · {productList.length}
            </EyebrowLabel>
            <ProductGrid
              products={rest.length > 0 ? rest : productList}
              emptyMessage={`No ${brand.name} products in the catalog yet.`}
            />
          </div>

          {/* Closing statement */}
          <div className="max-w-3xl border-t border-surface-elevated pt-12">
            <p className="font-display text-2xl text-text-secondary md:text-3xl">
              {brand.statement}
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
