import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { BrandCard } from '@/components/catalog/BrandCard'
import { type Locale } from '@/i18n/config'
import { getAllBrands } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('brands')
  return {
    title: t('pageTitle'),
    description: t('indexSubtitle'),
  }
}

export default async function BrandsPage() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('brands')
  const tNav = await getTranslations('navigation')
  const brandList = await getAllBrands(locale)

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('brands') },
            ]}
          />
          <div className="max-w-3xl space-y-4">
            <EyebrowLabel>{tNav('brands').toUpperCase()}</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              {t('indexHeading')}
            </Heading>
            <p className="font-body text-lg text-text-secondary">
              {t('indexSubtitle')}
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
