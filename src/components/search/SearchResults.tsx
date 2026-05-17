import { getTranslations } from 'next-intl/server'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProductWithRelations } from '@/db/schema'

interface SearchResultsProps {
  query: string
  results: ProductWithRelations[]
}

export async function SearchResults({ query, results }: SearchResultsProps) {
  const t = await getTranslations('search')
  const tNav = await getTranslations('navigation')

  if (query.trim().length === 0) {
    return <EmptyState message={t('tooShort')} />
  }

  if (results.length === 0) {
    return (
      <div className="space-y-12">
        <div className="space-y-2">
          <EyebrowLabel>{tNav('search').toUpperCase()}</EyebrowLabel>
          <Heading as="h1" size="lg">
            {t('noResults')}{' '}
            <span className="text-accent">&ldquo;{query}&rdquo;</span>
          </Heading>
        </div>
        <EmptyState
          message={t('noResultsHint')}
          actions={[
            { label: tNav('brands'), href: '/brands' },
            { label: tNav('categories'), href: '/categories' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <EyebrowLabel>
          {tNav('search').toUpperCase()} · {results.length}
        </EyebrowLabel>
        <Heading as="h1" size="lg">
          {t('resultsFor')}{' '}
          <span className="text-accent">&ldquo;{query}&rdquo;</span>
        </Heading>
      </div>
      <ProductGrid products={results} priorityCount={2} />
    </div>
  )
}
