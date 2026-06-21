import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SmartImage } from '@/components/ui/SmartImage'
import { InquiryForm } from '@/components/forms/InquiryForm'
import { type Locale } from '@/i18n/config'
import { getProductBySlug } from '@/server/queries'

export const dynamic = 'force-dynamic'

interface InquiryPageProps {
  params: Promise<{ locale: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: InquiryPageProps): Promise<Metadata> {
  const { locale, productSlug } = await params
  const t = await getTranslations('inquiry')
  const product = await getProductBySlug(productSlug, locale as Locale)
  if (!product) notFound()
  return {
    title: `${t('heading')} ${product.name}`,
    description: t('subheading'),
  }
}

export default async function InquiryPage({ params }: InquiryPageProps) {
  const { productSlug } = await params
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('inquiry')
  const tNav = await getTranslations('navigation')

  const product = await getProductBySlug(productSlug, locale)
  if (!product) notFound()

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('brands'), href: '/brands' },
              { label: product.brand.name, href: `/brands/${product.brand.slug}` },
              {
                label: product.name,
                href: `/products/${product.slug}`,
              },
              { label: tNav('inquiry') },
            ]}
          />

          {/* Header */}
          <div className="max-w-3xl space-y-4">
            <EyebrowLabel>{tNav('inquiry').toUpperCase()}</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              {t('heading')} {product.name}
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              {t('subheading')}
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
