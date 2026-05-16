import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SearchResults } from '@/components/search/SearchResults'
import { searchProducts } from '@/server/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the Dtech catalog.',
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const results = query.length >= 2 ? await searchProducts(query) : []

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
          <SearchResults query={query} results={results} />
        </div>
      </Container>
    </section>
  )
}
