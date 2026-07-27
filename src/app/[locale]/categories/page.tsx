import { getLocale } from 'next-intl/server'
import { permanentRedirect } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

/**
 * ROUND 13 — the categories-overview "catalogue" page is gone. There is ONE
 * catalogue surface (/products, URL-driven filters); category entry points
 * everywhere deep-link into it. The old URL 308s so bookmarks, old sitemap
 * hits and backlinks keep working.
 */
export default async function CategoriesIndexRedirect() {
  const locale = await getLocale()
  permanentRedirect({ href: '/products', locale })
}
