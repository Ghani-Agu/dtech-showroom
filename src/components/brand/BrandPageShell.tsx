'use client'

/**
 * BrandPageShell — the chrome wrapper every Brand-skin page uses: the
 * `.brand-root` provider + Brand header + a <main> for the page content +
 * Brand footer + the shared cart drawer (restyled by brand-design.css).
 * Keeps header/footer identical across the homepage and all inner routes.
 */

import type { ReactNode } from 'react'
import { BrandProvider } from './brand-context'
import { BrandHeader, BrandFooter } from './BrandChrome'
import { CartDrawer } from '@/components/showroom/CartDrawer'
import { FloatingCart } from '@/components/showroom/FloatingCart'

export function BrandPageShell({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  return (
    <BrandProvider locale={locale}>
      <BrandHeader />
      <main id="main-content" className="brand-main">
        {children}
      </main>
      <BrandFooter />
      <CartDrawer />
      <FloatingCart />
    </BrandProvider>
  )
}
