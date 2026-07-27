import { getLocale } from 'next-intl/server'
import { permanentRedirect } from '@/i18n/routing'
import {
  parseProductQuery,
  productQueryToSearch,
  type RawSearchParams,
} from '@/lib/product-filters'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: string; brandSlug: string }>
  searchParams: Promise<RawSearchParams>
}

/**
 * ROUND 13 — scoped brand pages folded into the ONE filtered catalogue:
 * /brands/<slug>[?category=…] 308s to /products?brand=<slug>[&category=…].
 * Extra facets (category, sort, q, featured, page) survive the hop.
 */
export default async function BrandRedirect({ params, searchParams }: Props) {
  const [{ brandSlug }, sp, locale] = await Promise.all([
    params,
    searchParams,
    getLocale(),
  ])
  const search = productQueryToSearch(parseProductQuery(sp), {
    brand: brandSlug,
  })
  const query = Object.fromEntries(new URLSearchParams(search))
  permanentRedirect({ href: { pathname: '/products', query }, locale })
}
