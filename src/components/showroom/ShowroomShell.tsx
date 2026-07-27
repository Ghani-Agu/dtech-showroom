'use client'

import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { usePathname } from '@/i18n/routing'
import { SiteNav } from './SiteNav'
import { ShowroomFooter } from './ShowroomChrome'
import { CartDrawer } from './CartDrawer'
import { FloatingCart } from './FloatingCart'
import '@/styles/showroom.css'

/**
 * Chrome wrapper for every non-home page — SELF-HEALING against the
 * classic ↔ brand design switch.
 *
 * Problem it solves: the layout (which renders this shell) can hold a
 * cached design value while a freshly-fetched page renders the other
 * design's chrome (BrandPageShell) → double header, or a classic page
 * body with no header at all.
 *
 * Solution: the shell ALWAYS renders the classic chrome, and pure CSS
 * hides it whenever the page brought its own Brand chrome:
 *   .sr-root:has(.brand-root) > .sr-classic-chrome { display: none }
 * (plus the shell's own bg/cart copies). No JS, no flash, and it heals
 * both mismatch directions instantly on every render.
 *
 * The homepage passes through untouched — both designs render their own
 * full chrome there.
 */
export function ShowroomShell({
  children,
}: {
  children: ReactNode
  design?: 'classic' | 'brand' | 'editorial'
}) {
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
      <div className="home-showcase-root hs-chrome sr-classic-chrome">
        <Suspense fallback={null}>
          <SiteNav variant="page" />
        </Suspense>
      </div>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <div className="sr-classic-chrome">
        <ShowroomFooter />
      </div>
      <CartDrawer />
      <FloatingCart />
    </div>
  )
}
