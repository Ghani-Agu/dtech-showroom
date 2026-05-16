import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CategoryCard } from '@/components/catalog/CategoryCard'
import { getAllCategories } from '@/server/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Every category in the Dtech catalog.',
}

export default async function CategoriesPage() {
  const categoryList = await getAllCategories()

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[{ label: 'Home', href: '/' }, { label: 'Categories' }]}
          />
          <div className="max-w-3xl space-y-4">
            <EyebrowLabel>CATEGORIES</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              Sorted by intent
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              Six categories cover the catalog: laptops, networking, storage, mobile,
              tablets, accessories.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {categoryList.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
