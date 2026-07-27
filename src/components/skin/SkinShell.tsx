/**
 * SkinShell — wraps ANY storefront page in the chrome of the design that is
 * currently live (Apparence → « Mettre en ligne »).
 *
 * Why this exists: the main routes (home, /products, product detail, /about,
 * /brands, /search, /account, /inquiry) each branched on `getPublishedDesign()`
 * by hand, but the smaller ones (legal, inquiry/sent, newsletter confirm &
 * unsubscribe, editor-made custom pages) never did — they always rendered the
 * classic dark chrome. Switching the site to the Brand or Éditorial skin left
 * those pages behind, so the new skin looked like it was only "half live".
 *
 * Server component: reads the published design once per request (React cache)
 * and picks the matching shell. On `classic` it renders children untouched —
 * the [locale] layout's ShowroomShell already supplies that chrome, and its
 * self-healing CSS (`.sr-root:has(.brand-root)…`) hides it when we bring one
 * of the other two.
 */

import type { ReactNode } from 'react'
import { getPublishedDesign } from '@/server/editor-page-data'
import { BrandPageShell } from '@/components/brand/BrandPageShell'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'

export async function SkinShell({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  const design = await getPublishedDesign()

  // `.brand-root * { margin:0; padding:0 }` (brand-design.css) and the
  // éditorial reset flatten the Tailwind spacing utilities these classic
  // pages rely on, so the light skins get an explicit content container —
  // `.sr-skinpage`, defined in showroom.css.
  if (design === 'brand') {
    return (
      <BrandPageShell locale={locale}>
        <div className="sr-skinpage">{children}</div>
      </BrandPageShell>
    )
  }
  if (design === 'editorial') {
    return (
      <EditorialPageShell locale={locale}>
        <div className="sr-skinpage">{children}</div>
      </EditorialPageShell>
    )
  }
  return <>{children}</>
}
