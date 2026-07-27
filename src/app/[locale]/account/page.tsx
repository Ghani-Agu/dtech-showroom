import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

/**
 * ROUND 16 — customer accounts were removed: visitors subscribe to the
 * newsletter through the site-wide pop-up instead (no storefront accounts,
 * zero web-app access). This route is a redirect STUB because the device
 * mount cannot delete files; the folder is safe to delete from Windows.
 */
export default async function AccountRedirect() {
  const locale = await getLocale()
  redirect({ href: '/', locale })
}
