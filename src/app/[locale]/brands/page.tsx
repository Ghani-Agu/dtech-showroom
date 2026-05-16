import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { BrandCard } from '@/components/catalog/BrandCard'
import { getAllBrands } from '@/server/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Every brand carried by Dtech Algérie.',
}

export default async function BrandsPage() {
  const brandList = await getAllBrands()

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Brands' }]} />
          <div className="max-w-3xl space-y-4">
            <EyebrowLabel>BRANDS</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              Brands carried by Dtech
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              Five lines. Each one selected with a clear position in the catalog.
              Click through to see the products carried under each brand.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {brandList.map((brand) => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
