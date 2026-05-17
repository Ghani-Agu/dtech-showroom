import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'
import { type Locale } from '@/i18n/config'
import { getProductBySlug } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('inquiry')
  return {
    title: t('sentTitle'),
    description: t('sentMessage'),
  }
}

interface SentPageProps {
  searchParams: Promise<{ from?: string }>
}

export default async function InquirySentPage({ searchParams }: SentPageProps) {
  const { from } = await searchParams
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('inquiry')
  const tNav = await getTranslations('navigation')

  const product = from ? await getProductBySlug(from, locale).catch(() => null) : null

  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <EyebrowLabel className="text-center">
            {t('sentTitle').toUpperCase()}
          </EyebrowLabel>
          <Heading as="h1" size="hero" accentChar="." className="text-center">
            {t('sentTitle')}
          </Heading>
          <p className="font-body text-lg text-text-secondary md:text-xl">
            {t('sentMessage')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4">
            <InquiryButton href="/">{t('sentAction')}</InquiryButton>
            {product ? (
              <InquiryButton href={`/brands/${product.brand.slug}`}>
                {tNav('brands')} · {product.brand.name}
              </InquiryButton>
            ) : null}
            {product ? (
              <InquiryButton href={`/products/${product.slug}`}>
                {product.name}
              </InquiryButton>
            ) : (
              <InquiryButton href="/">{tNav('home')}</InquiryButton>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
