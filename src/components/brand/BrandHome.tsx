'use client'

/**
 * BrandHome — the new "dtech Brand" storefront homepage.
 *
 * Renders the ported single-page design (hero → shop → brands → services →
 * about → contact) inside the shared BrandPageShell (header + footer), fed
 * entirely by the real catalogue passed from the server.
 */

import { BrandPageShell } from './BrandPageShell'
import {
  BrandHero,
  BrandFeatured,
  BrandBrands,
  BrandServices,
  BrandAbout,
  BrandContact,
} from './BrandSections'
import type { BrandData } from './brand-types'
import { BrandPartnerSection } from './BrandPartnerSection'
import type { PartnerBandData } from '@/server/partner-band'

export function BrandHome({
  locale,
  data,
  partner = null,
}: {
  locale: string
  data: BrandData
  partner?: PartnerBandData | null
}) {
  return (
    <BrandPageShell locale={locale}>
      <BrandHero heroImages={data.heroImages} />
      <BrandFeatured
        products={data.products}
        productCount={data.productCount}
        categories={data.categories}
      />
      <BrandServices />
      <BrandBrands brands={data.brands} />
      <BrandPartnerSection partner={partner} />
      <BrandAbout />
      <BrandContact />
    </BrandPageShell>
  )
}
