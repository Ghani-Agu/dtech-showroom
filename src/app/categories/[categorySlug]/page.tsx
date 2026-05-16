import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SmartImage } from '@/components/ui/SmartImage'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import {
  getCategoryBySlug,
  getProductsByCategory,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)
  if (!category) return { title: 'Category not found' }
  return {
    title: category.name,
    description: category.description,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const productList = await getProductsByCategory(categorySlug)

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-16">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Categories', href: '/categories' },
              { label: category.name },
            ]}
          />

          <div className="space-y-8">
            <div className="relative aspect-[16/7] w-full overflow-hidden rounded-md bg-surface-elevated">
              <SmartImage
                src={category.heroImagePath}
                alt={category.name}
                fallbackVariant="category"
                fill
                sizes="(min-width: 1024px) 80vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="max-w-3xl space-y-4">
              <EyebrowLabel>CATEGORY</EyebrowLabel>
              <Heading as="h1" size="hero">
                {category.name}
              </Heading>
              <p className="font-body text-lg text-text-secondary">
                {category.description}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <EyebrowLabel>
              ALL {category.name.toUpperCase()} · {productList.length}
            </EyebrowLabel>
            <ProductGrid
              products={productList}
              emptyMessage={`No products in ${category.name} yet.`}
            />
          </div>
        </div>
      </Container>
    </section>
  )
}
