import { getLocale } from 'next-intl/server'
import { permanentRedirect } from '@/i18n/routing'
import {
  parseProductQuery,
  productQueryToSearch,
  type RawSearchParams,
} from '@/lib/product-filters'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: string; categorySlug: string }>
  searchParams: Promise<RawSearchParams>
}

/**
 * ROUND 13 — scoped category pages folded into the ONE filtered catalogue:
 * /categories/<slug>[?brand=…] 308s to /products?category=<slug>[&brand=…].
 * Extra facets (brand, sort, q, featured, page) survive the hop.
 */
export default async function CategoryRedirect({ params, searchParams }: Props) {
  const [{ categorySlug }, sp, locale] = await Promise.all([
    params,
    searchParams,
    getLocale(),
  ])
  const search = productQueryToSearch(parseProductQuery(sp), {
    category: categorySlug,
  })
  const query = Object.fromEntries(new URLSearchParams(search))
  permanentRedirect({ href: { pathname: '/products', query }, locale })
}
