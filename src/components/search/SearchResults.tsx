import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProductWithRelations } from '@/db/schema'

interface SearchResultsProps {
  query: string
  results: ProductWithRelations[]
}

export function SearchResults({ query, results }: SearchResultsProps) {
  if (query.trim().length === 0) {
    return (
      <EmptyState
        message="Type at least two characters to search the catalog."
      />
    )
  }

  if (results.length === 0) {
    return (
      <div className="space-y-12">
        <div className="space-y-2">
          <EyebrowLabel>SEARCH</EyebrowLabel>
          <Heading as="h1" size="lg">
            No matches for{' '}
            <span className="text-accent">&ldquo;{query}&rdquo;</span>
          </Heading>
        </div>
        <EmptyState
          message="Nothing in the catalog matched. Try a different word, or browse the brands and categories."
          actions={[
            { label: 'All brands', href: '/brands' },
            { label: 'All categories', href: '/categories' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <EyebrowLabel>SEARCH · {results.length} RESULTS</EyebrowLabel>
        <Heading as="h1" size="lg">
          Showing results for{' '}
          <span className="text-accent">&ldquo;{query}&rdquo;</span>
        </Heading>
      </div>
      <ProductGrid products={results} priorityCount={2} />
    </div>
  )
}
