/**
 * seo.ts — one place for canonical URLs, hreflang alternates and JSON-LD.
 *
 * Before this existed every route hand-rolled `{ title, description }` and
 * nothing emitted a canonical, hreflang or structured data. Search engines
 * saw three locales of the same page with no relationship declared between
 * them, and no product markup at all.
 *
 * Pure module — no server-only imports — so route files, layouts and the
 * sitemap can all share it.
 */

import { locales, type Locale } from '@/i18n/config'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'
).replace(/\/+$/, '')

export const SITE_NAME = 'D-Tech Algérie'

/** Absolute URL for a locale-prefixed path (`/products`, `/products?x=1`). */
export function absUrl(locale: string, path = ''): string {
  const clean = path === '/' ? '' : path
  return `${SITE_URL}/${locale}${clean}`
}

/**
 * `alternates` block for a page: self-canonical plus one hreflang entry per
 * locale and an x-default pointing at French (the primary market language).
 */
export function alternatesFor(locale: string, path = '') {
  return {
    canonical: absUrl(locale, path),
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, absUrl(l, path)])),
      'x-default': absUrl('fr', path),
    },
  }
}

/** Build a `?a=b` suffix from defined, non-empty values, in a stable order. */
export function queryString(
  params: Record<string, string | number | undefined | null>
): string {
  const sp = new URLSearchParams()
  for (const key of Object.keys(params).sort()) {
    const v = params[key]
    if (v === undefined || v === null || v === '') continue
    sp.set(key, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const OG_LOCALE: Record<Locale, string> = {
  fr: 'fr_DZ',
  ar: 'ar_DZ',
  en: 'en_US',
}

/** Shared `openGraph` block. `path` must already include any query string. */
export function openGraphFor(
  locale: Locale,
  path: string,
  title: string,
  description: string
) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    locale: OG_LOCALE[locale] ?? 'fr_DZ',
    url: absUrl(locale, path),
    title,
    description,
  }
}

/* ─────────────────────────────────────────────────────────────────
 * JSON-LD
 * ──────────────────────────────────────────────────────────────── */

type Json = Record<string, unknown>

export function organizationLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    email: 'contact@dtech.dz',
    telephone: '+213560990506',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bab Ezzouar',
      addressRegion: 'Alger',
      addressCountry: 'DZ',
    },
    sameAs: [
      'https://www.facebook.com/DtechDZ',
      'https://www.instagram.com/dtechdz',
      'https://www.linkedin.com/company/d-techalgerie',
    ],
  }
}

export function breadcrumbLd(
  locale: string,
  trail: { name: string; path: string }[]
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absUrl(locale, t.path),
    })),
  }
}

/**
 * ItemList for a catalogue page. Uses `url` entries rather than embedded
 * Product objects — Google prefers a lightweight list on collection pages
 * and full Product markup on the detail page.
 */
export function itemListLd(
  locale: string,
  items: { slug: string; name: string }[],
  offset = 0
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((p, i) => ({
      '@type': 'ListItem',
      position: offset + i + 1,
      name: p.name,
      url: absUrl(locale, `/products/${p.slug}`),
    })),
  }
}

export function productLd(
  locale: string,
  p: {
    slug: string
    name: string
    description?: string | null
    brandName?: string | null
    categoryName?: string | null
    image?: string | null
    sku?: string | null
    rating?: { value: number; count: number } | null
  }
): Json {
  const ld: Json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url: absUrl(locale, `/products/${p.slug}`),
    ...(p.description ? { description: p.description } : {}),
    ...(p.image
      ? { image: p.image.startsWith('http') ? p.image : `${SITE_URL}${p.image}` }
      : {}),
    ...(p.brandName ? { brand: { '@type': 'Brand', name: p.brandName } } : {}),
    ...(p.categoryName ? { category: p.categoryName } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
  }
  if (p.rating && p.rating.count > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating.value,
      reviewCount: p.rating.count,
      bestRating: 5,
      worstRating: 1,
    }
  }
  // No `offers`: the catalogue carries no price column, and emitting an
  // Offer without a price is a structured-data error in Search Console.
  return ld
}

/** Renders one or more JSON-LD blobs. Server-component friendly. */
export function jsonLdScript(data: Json | Json[]): string {
  const payload = Array.isArray(data) ? data : [data]
  // `<` escaped so the JSON can never terminate the script element early.
  return JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(
    /</g,
    '\\u003c'
  )
}
