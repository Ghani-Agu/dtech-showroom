'use client'

/**
 * EditorialPageShell — chrome wrapper for every Éditorial-skin page:
 * `.editorial-root` provider + pill header + <main> + footer + the shared
 * cart drawer / floating cart (restyled through the --sr-* remap in
 * editorial-design.css). Mirrors BrandPageShell so inner routes wrap the
 * SAME body markup they already render in the other skins.
 */

import type { ReactNode } from 'react'
import type { EdText } from '@/lib/ed-editor/model'
import { EditorialProvider } from './editorial-context'
import { EditorialHeader, EditorialFooter } from './EditorialChrome'
import { CartDrawer } from '@/components/showroom/CartDrawer'
import { FloatingCart } from '@/components/showroom/FloatingCart'

export function EditorialPageShell({
  locale,
  children,
  text,
}: {
  locale: string
  children: ReactNode
  /** Surcharges de texte publiées depuis l'éditeur (voir EditorialProvider). */
  text?: Record<string, EdText>
}) {
  return (
    <EditorialProvider locale={locale} text={text}>
      <EditorialHeader />
      <main id="main-content" className="ed-main">
        {children}
      </main>
      <EditorialFooter />
      <CartDrawer />
      <FloatingCart />
    </EditorialProvider>
  )
}
