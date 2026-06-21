'use client'

import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { usePathname } from '@/i18n/routing'
import { SiteNav } from './SiteNav'
import { ShowroomFooter } from './ShowroomChrome'
import { CartDrawer } from './CartDrawer'
import '@/styles/showroom.css'

/**
 * Wraps every non-home page in the showroom chrome. The header is the
 * SAME SiteNav the homepage uses — mounted inside a display:contents
 * `.home-showcase-root` wrapper so home-showcase.css styles it
 * identically (incl. the light theme). The homepage renders its own
 * SiteNav/footer (HomeShowcase), so it passes through untouched.
 */
export function ShowroomShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/') {
    return (
      <main id="main-content" className="flex-1">
        {children}
      </main>
    )
  }
  return (
    <div className="sr-root">
      <div className="sr-bg" />
      <div className="sr-grid-bg" />
      <div className="home-showcase-root hs-chrome">
        <Suspense fallback={null}>
          <SiteNav variant="page" />
        </Suspense>
      </div>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <ShowroomFooter />
      <CartDrawer />
    </div>
  )
}
