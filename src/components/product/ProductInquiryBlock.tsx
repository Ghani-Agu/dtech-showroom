import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'

interface ProductInquiryBlockProps {
  productSlug: string
  productName: string
}

export function ProductInquiryBlock({
  productSlug,
  productName,
}: ProductInquiryBlockProps) {
  return (
    <div className="space-y-6 rounded-md bg-surface-elevated p-8 md:p-12">
      <EyebrowLabel>INTERESTED?</EyebrowLabel>
      <Heading as="h2" size="lg" accentChar=".">
        Discuss this with us
      </Heading>
      <p className="max-w-2xl font-body text-lg text-text-secondary">
        Send a short note about how you intend to use the {productName}. Dtech will
        respond within one business day with availability, configuration options, and
        a quote.
      </p>
      <InquiryButton href={`/inquiry/${productSlug}`}>
        Discuss this with us
      </InquiryButton>
    </div>
  )
}
