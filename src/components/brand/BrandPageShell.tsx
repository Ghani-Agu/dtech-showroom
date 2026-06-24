'use client'

/**
 * BrandPageShell — the chrome wrapper every Brand-skin page uses: the
 * `.brand-root` provider + Brand header + a <main> for the page content +
 * Brand footer. Keeps header/footer identical across the homepage and all
 * inner routes (catalog, product, brands, …).
 */

import type { ReactNode } from 'react'
import { BrandProvider } from './brand-context'
import { BrandHeader, BrandFooter } from './BrandChrome'

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
    </BrandProvider>
  )
}
