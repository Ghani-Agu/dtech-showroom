'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/i18n/routing'

/**
 * Suppresses the global site chrome (header/footer) on the homepage,
 * where the Nightline showcase renders its own nav and footer.
 * Rendered during SSR too, so there is no flash of duplicated chrome.
 */
export function HideOnHome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <>{children}</>
}
