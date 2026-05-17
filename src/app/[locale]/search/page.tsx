import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SearchResults } from '@/components/search/SearchResults'
import { type Locale } from '@/i18n/config'
import { searchProducts } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('search')
  return {
    title: t('pageTitle'),
    description: t('placeholder'),
  }
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const locale = (await getLocale()) as Locale
  const tNav = await getTranslations('navigation')
  const query = (q ?? '').trim()
  const results = query.length >= 2 ? await searchProducts(query, locale) : []

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('search') },
            ]}
          />
          <SearchResults query={query} results={results} />
        </div>
      </Container>
    </section>
  )
}
