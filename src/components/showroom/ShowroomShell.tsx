'use client'

import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { usePathname } from '@/i18n/routing'
import { SiteNav } from './SiteNav'
import { ShowroomFooter } from './ShowroomChrome'
import { CartDrawer } from './CartDrawer'
import '@/styles/showroom.css'

/**
 * When the "brand" design is live, a page is rendered bare here — it supplies
 * its own chrome via BrandPageShell — but ONLY once that route has a Brand
 * version. Routes not yet ported stay fully on the classic chrome below, so
 * the site is never left without a header/footer. Extend this as each Brand
 * route ships (keep in sync with the page-level `design === 'brand'` branch).
 */
function isBrandReady(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname === '/about') return true
  if (pathname === '/products' || pathname.startsWith('/products/')) return true
  if (pathname === '/brands' || pathname.startsWith('/brands/')) return true
  if (pathname === '/categories' || pathname.startsWith('/categories/')) return true
  if (pathname === '/search') return true
  // /inquiry/[slug] is branded, but /inquiry/sent (success) stays classic.
  if (pathname.startsWith('/inquiry/') && pathname !== '/inquiry/sent') return true
  return false
}

/**
 * Wraps every non-home page in the showroom chrome. The header is the
 * SAME SiteNav the homepage uses — mounted inside a display:contents
 * `.home-showcase-root` wrapper so home-showcase.css styles it
 * identically (incl. the light theme). The homepage renders its own
 * SiteNav/footer (HomeShowcase), so it passes through untouched.
 */
export function ShowroomShell({
  children,
  design = 'classic',
}: {
  children: ReactNode
  design?: 'classic' | 'brand'
}) {
  const pathname = usePathname()

  // Brand design: the page (BrandPageShell) supplies its own header/footer.
  if (design === 'brand' && isBrandReady(pathname)) {
    return <>{children}</>
  }

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
