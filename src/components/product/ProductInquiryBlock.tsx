import { getTranslations } from 'next-intl/server'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'

interface ProductInquiryBlockProps {
  productSlug: string
  productName: string
}

export async function ProductInquiryBlock({
  productSlug,
  productName,
}: ProductInquiryBlockProps) {
  const t = await getTranslations('products')

  return (
    <div className="space-y-6 rounded-md bg-surface-elevated p-8 md:p-12">
      <EyebrowLabel>{t('interested').toUpperCase()}</EyebrowLabel>
      <Heading as="h2" size="lg" accentChar=".">
        {t('discussTitle')}
      </Heading>
      <p className="max-w-2xl font-body text-lg text-text-secondary">
        {t('discussBody', { product: productName })}
      </p>
      <InquiryButton href={`/inquiry/${productSlug}`}>
        {t('discussTitle')}
      </InquiryButton>
    </div>
  )
}
