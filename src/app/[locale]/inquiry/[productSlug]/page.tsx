import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SmartImage } from '@/components/ui/SmartImage'
import { InquiryForm } from '@/components/forms/InquiryForm'
import { getProductBySlug } from '@/server/queries'

export const dynamic = 'force-dynamic'

interface InquiryPageProps {
  params: Promise<{ productSlug: string }>
}

export async function generateMetadata({
  params,
}: InquiryPageProps): Promise<Metadata> {
  const { productSlug } = await params
  const product = await getProductBySlug(productSlug)
  if (!product) return { title: 'Inquiry' }
  return {
    title: `Inquire about ${product.name}`,
    description: `Send Dtech an inquiry about the ${product.name}.`,
  }
}

export default async function InquiryPage({ params }: InquiryPageProps) {
  const { productSlug } = await params
  const product = await getProductBySlug(productSlug)
  if (!product) notFound()

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Brands', href: '/brands' },
              { label: product.brand.name, href: `/brands/${product.brand.slug}` },
              {
                label: product.name,
                href: `/products/${product.slug}`,
              },
              { label: 'Inquiry' },
            ]}
          />

          {/* Header */}
          <div className="max-w-3xl space-y-4">
            <EyebrowLabel>INQUIRY</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              Discuss this with us
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              Tell Dtech how you intend to use this. We respond within one business
              day with availability, configuration options, and a quote.
            </p>
          </div>

          {/* Product context */}
          <div className="flex items-center gap-4 rounded-md bg-surface-elevated p-4 md:gap-6 md:p-6">
            <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-sm bg-surface-base md:w-36">
              <SmartImage
                src={product.cardImagePath}
                alt={product.name}
                fallbackVariant="product"
                fill
                sizes="144px"
                className="object-cover"
              />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                {product.brand.name} · {product.category.name}
              </p>
              <p className="font-display text-2xl text-text-primary">
                {product.name}
              </p>
              <p className="font-mono text-xs text-text-muted">{product.cardSpec}</p>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-3xl">
            <InquiryForm productSlug={product.slug} />
          </div>
        </div>
      </Container>
    </section>
  )
}
