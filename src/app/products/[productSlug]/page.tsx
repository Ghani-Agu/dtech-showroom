import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { InquiryButton } from '@/components/ui/InquiryButton'
import { ProductStage } from '@/components/product/ProductStage'
import { ProductSpecs } from '@/components/product/ProductSpecs'
import { ProductInquiryBlock } from '@/components/product/ProductInquiryBlock'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import {
  getProductBySlug,
  getRelatedProducts,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

interface ProductPageProps {
  params: Promise<{ productSlug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { productSlug } = await params
  const product = await getProductBySlug(productSlug)
  if (!product) return { title: 'Product not found' }
  return {
    title: `${product.name} — ${product.brand.name}`,
    description: product.tagline,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productSlug } = await params
  const product = await getProductBySlug(productSlug)
  if (!product) notFound()

  const related = await getRelatedProducts(product.id, product.brandId, 3)
  const paragraphs = product.description.split(/\n\n+/)

  return (
    <section className="py-12 md:py-16">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Brands', href: '/brands' },
              { label: product.brand.name, href: `/brands/${product.brand.slug}` },
              { label: product.name },
            ]}
          />

          {/* Stage */}
          <ProductStage product={product} />

          {/* Header */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl space-y-4">
              <EyebrowLabel>
                {product.brand.name.toUpperCase()} · {product.category.name.toUpperCase()}
              </EyebrowLabel>
              <Heading as="h1" size="xl">
                {product.name}
              </Heading>
              <p className="font-display text-2xl text-text-secondary md:text-3xl">
                {product.tagline}
              </p>
            </div>
            <div className="lg:pb-2">
              <InquiryButton href={`/inquiry/${product.slug}`}>
                Discuss this with us
              </InquiryButton>
            </div>
          </div>

          {/* Description */}
          <div className="max-w-3xl space-y-6">
            {paragraphs.map((p, i) => (
              <p key={i} className="font-body text-lg leading-relaxed text-text-secondary">
                {p}
              </p>
            ))}
          </div>

          {/* Specs */}
          <div className="space-y-6">
            <EyebrowLabel>SPECIFICATIONS</EyebrowLabel>
            <ProductSpecs specs={product.specs} />
          </div>

          {/* Inquiry block */}
          <ProductInquiryBlock
            productSlug={product.slug}
            productName={product.name}
          />

          {/* Related */}
          {related.length > 0 ? (
            <div className="space-y-8">
              <EyebrowLabel>
                OTHER {product.brand.name.toUpperCase()} PRODUCTS
              </EyebrowLabel>
              <ProductGrid products={related} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
