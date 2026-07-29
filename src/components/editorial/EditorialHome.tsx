'use client'

/**
 * EditorialHome — section order (evolved from the design's app shell on
 * Ghani's requests):
 *   Hero → Catalogue → Marquee → Proof → History band → Why →
 *   Fan → Contact → Footer  (curtain wipes, demo, band 2 and the
 *   Tiers/« Combien ça coûte » accordion removed — round 21b)
 * plus the live shop's cart drawer / floating cart. Fed by EdData (real
 * catalogue).
 */

import { EditorialProvider } from './editorial-context'
import { EditorialHeader, EditorialFooter } from './EditorialChrome'
import { CartDrawer } from '@/components/showroom/CartDrawer'
import { FloatingCart } from '@/components/showroom/FloatingCart'
import {
  EdHero,
  EdCatalogue,
  EdProof,
  EdMarquee,
  EdHistory,
  EdWhy,
  EdFan,
  EdContact,
} from './EditorialSections'
import type { EdData } from './editorial-types'

function HomeBody({ data }: { data: EdData }) {
  const previews = [
    data.heroImage,
    ...data.cats.slice(0, 5).map((c) => c.img),
  ]
  return (
    <>
      <EditorialHeader previews={previews} />
      <main id="main-content">
        <EdHero heroImage={data.heroImage} />
        <EdCatalogue data={data} />
        <EdMarquee data={data} />
        <EdProof data={data} />
        {/* [PORT+] the history band: dedicated photo + typeset story
            (color-animated mark, live counters, catalogue thumbnails). */}
        <EdHistory data={data} />
        <EdWhy bento={data.bento} />
        <EdFan data={data} />
        <EdContact />
      </main>
      <EditorialFooter catNames={data.cats.map((c) => ({ id: c.id, name: c.name }))} />
      <CartDrawer />
      <FloatingCart />
    </>
  )
}

export function EditorialHome({ locale, data }: { locale: string; data: EdData }) {
  return (
    <EditorialProvider locale={locale}>
      <HomeBody data={data} />
    </EditorialProvider>
  )
}
