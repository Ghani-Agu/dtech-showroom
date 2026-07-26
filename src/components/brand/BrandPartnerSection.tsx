'use client'

import { PartnerBand } from '@/components/home/PartnerBand'
import type { PartnerBandData } from '@/server/partner-band'
import { useBrand } from './brand-context'
import { fmtNum } from './brand-i18n'

/**
 * Brand-skin wrapper for the partner spotlight.
 *
 * The brand skin doesn't use next-intl (it has its own `brand-i18n` record) and
 * has no EditProvider, so the shared band receives plain strings here rather
 * than `<Editable>` nodes. Same visual component either way — the band paints
 * its own partner-coloured background, so it needs nothing from the skin.
 */
export function BrandPartnerSection({
  partner,
}: {
  partner: PartnerBandData | null
}) {
  const { lang } = useBrand()
  if (!partner) return null

  const brand = partner.brandName
  const c: Copy = COPY[lang] ?? FR

  return (
    <PartnerBand
      brandSlug={partner.brandSlug}
      brandName={brand}
      logoPath={partner.logoPath}
      accent={partner.accent}
      accentDeep={partner.accentDeep}
      eyebrow={c.eyebrow(brand)}
      partnerLine={c.line(brand)}
      heading={c.title(brand)}
      sub={c.sub(brand)}
      ctaLabel={c.cta(brand)}
      tiles={partner.tiles.map((t) => ({
        ...t,
        sub: c.tileSub(fmtNum(Number(t.sub), lang)),
      }))}
    />
  )
}

type Copy = {
  eyebrow: (b: string) => string
  line: (b: string) => string
  title: (b: string) => string
  sub: (b: string) => string
  cta: (b: string) => string
  tileSub: (n: string) => string
}

const FR: Copy = {
  eyebrow: (b) => `Partenaire ${b}`,
  line: (b) => `D-Tech Algérie × ${b}`,
  title: (b) => `La gamme professionnelle ${b}, chez votre distributeur.`,
  sub: (b) =>
    `Postes de travail, écrans et impression ${b} pour entreprises et administrations — avec devis, facture et garantie officielle, livrés dans les 58 wilayas.`,
  cta: (b) => `Découvrir la gamme ${b}`,
  tileSub: (n) => `${n} produits`,
}

const COPY: Record<string, Copy> = {
  fr: FR,
  en: {
    eyebrow: (b) => `${b} partner`,
    line: (b) => `D-Tech Algeria × ${b}`,
    title: (b) => `The professional ${b} range, from your distributor.`,
    sub: (b) =>
      `${b} workstations, displays and printing for businesses and public bodies — with a written quote, invoice and official warranty, delivered across all 58 wilayas.`,
    cta: (b) => `Explore the ${b} range`,
    tileSub: (n) => `${n} products`,
  },
  ar: {
    eyebrow: (b) => `شريك ${b}`,
    line: (b) => `دي-تاك الجزائر × ${b}`,
    title: (b) => `تشكيلة ${b} الاحترافية، عند موزّعكم المعتمد.`,
    sub: (b) =>
      `محطات عمل وشاشات وطابعات ${b} للمؤسسات والإدارات — مع تسعيرة وفاتورة وضمان رسمي، والتوصيل إلى 58 ولاية.`,
    cta: (b) => `اكتشف تشكيلة ${b}`,
    tileSub: (n) => `${n} منتج`,
  },
}
