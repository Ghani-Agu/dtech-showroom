import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'
import { getProductBySlug } from '@/server/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Inquiry sent',
  description: 'Dtech has received your inquiry.',
}

interface SentPageProps {
  searchParams: Promise<{ from?: string }>
}

export default async function InquirySentPage({ searchParams }: SentPageProps) {
  const { from } = await searchParams
  const product = from ? await getProductBySlug(from).catch(() => null) : null

  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <EyebrowLabel className="text-center">INQUIRY RECEIVED</EyebrowLabel>
          <Heading as="h1" size="hero" accentChar="." className="text-center">
            Sent
          </Heading>
          <p className="font-body text-lg text-text-secondary md:text-xl">
            Dtech will respond within one business day.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4">
            <InquiryButton href="/">Browse more products</InquiryButton>
            {product ? (
              <InquiryButton href={`/brands/${product.brand.slug}`}>
                View other {product.brand.name} products
              </InquiryButton>
            ) : null}
            {product ? (
              <InquiryButton href={`/products/${product.slug}`}>
                Back to {product.name}
              </InquiryButton>
            ) : (
              <InquiryButton href="/">Back to home</InquiryButton>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
