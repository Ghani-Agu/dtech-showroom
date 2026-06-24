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
  BrandShop,
  BrandBrands,
  BrandServices,
  BrandAbout,
  BrandContact,
} from './BrandSections'
import type { BrandData } from './brand-types'

export function BrandHome({ locale, data }: { locale: string; data: BrandData }) {
  return (
    <BrandPageShell locale={locale}>
      <BrandHero heroImages={data.heroImages} productCount={data.products.length} />
      <BrandShop products={data.products} categories={data.categories} />
      <BrandBrands brands={data.brands} />
      <BrandServices />
      <BrandAbout />
      <BrandContact />
    </BrandPageShell>
  )
}
