You are executing Phase 8 — Internationalization (EN + FR) for the 
Dtech Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7 complete (latest commit: 0c3eaa2). Admin tool is 
  feature-complete. 
- Bilingual columns already in DB from Phase 7c: products._fr, 
  brands._fr, categories._fr (name_fr, tagline_fr, description_fr, 
  card_spec_fr, search_keywords_fr, statement_fr where applicable)
- Real client engagement with Dtech Algérie
- v2 brand spec is source of truth for visual decisions
- LOCKED architecture decisions:
  - Library: next-intl (industry standard for App Router)
  - Locales: ['en', 'fr'] with type-safe extension for 'ar' later
  - Default: 'en'
  - URL strategy: /en/... and /fr/... with / redirecting via Accept-Language
  - Admin: stays English-only (NO admin URL changes)
  - Customer-facing: fully bilingual
  - Translation source: Claude generates initial FR; Dtech reviews before launch
- Arabic (ar) deferred to Phase 11 post-launch — code MUST be 
  architected so adding 'ar' is one-line later

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Restructure all customer-facing routes under a [locale] segment with 
next-intl handling translation, locale detection, and routing. Every 
visible UI string extracted to messages/en.json and messages/fr.json. 
Public database queries read _fr columns with fallback to EN when null. 
Add hreflang tags, per-locale sitemaps, per-locale OG metadata. 
Middleware detects locale from URL prefix and Accept-Language header. 
Root path / redirects to /en (or /fr if Accept-Language matches). 
Admin routes stay untouched at /admin/* (English-only). After this 
lands, customers can browse the entire catalog in French or English 
with proper SEO and URL structure.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Arabic support — deferred to Phase 11 (post-launch)
- RTL layout system — deferred
- Admin UI translations — admin stays English
- Customer login/account routing (no customer auth exists)
- Currency localization (no commerce)
- Date format localization beyond what next-intl provides natively
- Number format localization for specs (specs values are unitless or 
  already-internationalized like "32GB")
- Auto-translation of product content (Dtech enters FR content via 
  admin per product)
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Modifying v2 brand spec
- Auth flow changes
- New customer-facing features
- Touching /motion or any (dev) routes

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install next-intl
  2. Configure next-intl (i18n config + types)
  3. Create messages/en.json + messages/fr.json with all UI strings
  4. Update middleware to handle locale + admin protection
  5. Restructure customer routes under [locale] segment
  6. Update layout.tsx (root + locale) for next-intl provider
  7. Update each customer page component to use translations
  8. Update queries to read _fr columns with EN fallback
  9. Update sitemap.ts for per-locale entries + hreflang
  10. Update OG image generators for per-locale content
  11. Update root not-found.tsx + error.tsx for locale-aware
  12. Add locale switcher component in nav
  13. Verification (lint, tsc, build, smoke tests)
  14. Commit

tsc checkpoint after task 4 and task 8.

================================================================
TASK 1 — INSTALL NEXT-INTL
================================================================

Run:
  pnpm add next-intl

Verify version is 4.x (compatible with Next 16):
  pnpm list next-intl

Bundle impact: ~30KB gzipped. Acceptable.

================================================================
TASK 2 — NEXT-INTL CONFIGURATION
================================================================

Create src/i18n/config.ts:

```typescript
export const locales = ['en', 'fr'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
}

// Type-safe locale check
export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale)
}
```

Create src/i18n/request.ts (server-side message loading):

```typescript
import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, defaultLocale, isValidLocale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate locale from request
  const requested = await requestLocale
  const locale = requested && isValidLocale(requested) ? requested : defaultLocale
  
  let messages
  try {
    messages = (await import(`../../messages/${locale}.json`)).default
  } catch {
    notFound()
  }
  
  return {
    locale,
    messages,
  }
})
```

Create src/i18n/routing.ts (next-intl 4.x routing config):

```typescript
import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',  // every URL has /en or /fr prefix
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

Update next.config.ts to register the i18n plugin:

```typescript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Existing config object
const nextConfig = {
  // ... existing config preserved
}

export default withNextIntl(nextConfig)
```

If next.config.ts uses ES module syntax (`export default { ... }`), 
extract to a named const first, then wrap with withNextIntl.

================================================================
TASK 3 — TRANSLATION FILES
================================================================

Create messages/en.json with EVERY UI string used in customer-facing 
components. Organize by feature/page namespace.

Create the file with this structure (full content):

```json
{
  "common": {
    "siteName": "Dtech",
    "tagline": "Hardware, presented properly.",
    "search": "Search",
    "searchPlaceholder": "Search the catalog",
    "viewAll": "View all",
    "loading": "Loading...",
    "error": "Something went wrong",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "submit": "Submit",
    "close": "Close",
    "open": "Open",
    "menu": "Menu",
    "skipToContent": "Skip to content"
  },
  "navigation": {
    "home": "Home",
    "catalog": "Catalog",
    "brands": "Brands",
    "categories": "Categories",
    "about": "About",
    "contactDtech": "Contact Dtech",
    "viewSite": "View site"
  },
  "home": {
    "eyebrow": "DTECH ALGÉRIE · EST. 2006",
    "headline": "Hardware,",
    "headlineLine2": "presented",
    "headlineLine3": "properly",
    "description": "A curated catalog of laptops, networking, mobile, and accessories from HP, Dell, ASUS, TP-Link, and the in-house D-Tech line. Browse the showroom. Inquire when you find the machine.",
    "browseCatalog": "Browse the catalog",
    "featuredTitle": "The current selection",
    "featuredSubtitle": "Five products we think are worth your time.",
    "brandsTitle": "Five lines, considered",
    "brandsSubtitle": "We carry brands that match the showroom standard.",
    "categoriesTitle": "Sorted by intent",
    "categoriesSubtitle": "Find by what you need it for, not what we call it."
  },
  "brands": {
    "pageTitle": "Brands",
    "indexHeading": "Brands we carry",
    "indexSubtitle": "Five lines selected for build quality, distribution rights, and product depth.",
    "viewProducts": "View products"
  },
  "categories": {
    "pageTitle": "Categories",
    "indexHeading": "Sorted by intent",
    "indexSubtitle": "Browse the catalog by what you're looking for.",
    "viewCategory": "View category"
  },
  "products": {
    "pageTitle": "Products",
    "specifications": "Specifications",
    "inquireButton": "Inquire about this product",
    "relatedProducts": "Related products",
    "viewProduct": "View product",
    "notAvailable": "Not available"
  },
  "search": {
    "pageTitle": "Search",
    "heading": "Search results",
    "placeholder": "Search for a product, brand, or category",
    "resultsFor": "Results for",
    "noResults": "No results found",
    "noResultsHint": "Try a different search term or browse the catalog directly.",
    "tooShort": "Search must be at least 2 characters"
  },
  "inquiry": {
    "pageTitle": "Inquire",
    "heading": "Inquire about",
    "subheading": "Send us a message about this product. We'll respond within one business day.",
    "fullName": "Full name",
    "fullNamePlaceholder": "Your full name",
    "email": "Email",
    "emailPlaceholder": "you@example.com",
    "phone": "Phone",
    "phonePlaceholder": "+213 ...",
    "company": "Company (optional)",
    "companyPlaceholder": "Your company",
    "message": "Message",
    "messagePlaceholder": "Tell us what you'd like to know about this product...",
    "submit": "Send inquiry",
    "submitting": "Sending...",
    "sentTitle": "Inquiry sent",
    "sentMessage": "We've received your inquiry and will respond within one business day.",
    "sentAction": "Browse the catalog",
    "errors": {
      "required": "This field is required",
      "invalidEmail": "Please enter a valid email address",
      "messageTooShort": "Message must be at least 10 characters",
      "submitFailed": "Could not send inquiry. Please try again."
    }
  },
  "about": {
    "pageTitle": "About",
    "heading": "About Dtech",
    "establishedSince": "Established 2006",
    "introduction": "Dtech is an Algerian technology distributor based in Algiers. We carry hardware from HP, Dell, ASUS, TP-Link, and our in-house D-Tech line, serving businesses and individuals across Algeria.",
    "approach": "Our approach",
    "approachBody": "We curate what we carry. We don't list every SKU available from every manufacturer. We carry products we'd recommend, and we present each one with the attention it deserves.",
    "contact": "Contact",
    "contactBody": "For product inquiries, use the inquiry button on any product page. For partnership or wholesale inquiries, write to us directly."
  },
  "footer": {
    "wordmark": "DTECH",
    "tagline": "Hardware. Quietly considered.",
    "copyright": "© {year} Dtech Algérie. All rights reserved.",
    "established": "Est. 2006 · Algiers"
  },
  "notFound": {
    "title": "Not found",
    "heading": "We couldn't find that page",
    "description": "The page you're looking for doesn't exist or has been moved.",
    "action": "Back to home"
  },
  "errors": {
    "title": "Something went wrong",
    "heading": "An error occurred",
    "description": "We've been notified. Please try again or return to the home page.",
    "retry": "Try again",
    "home": "Back to home"
  },
  "metadata": {
    "siteName": "Dtech Algérie",
    "defaultTitle": "Dtech — Hardware, presented properly.",
    "defaultDescription": "A curated catalog of laptops, networking, mobile, and accessories from HP, Dell, ASUS, TP-Link, and the in-house D-Tech line.",
    "ogImageAlt": "Dtech Algérie"
  }
}
```

Create messages/fr.json with French translations of all the same keys. 
GENERATE these translations with care — this is the canonical FR copy 
Dtech will see at launch. Use formal but warm French appropriate for 
a tech distributor's marketing site. Examples:

```json
{
  "common": {
    "siteName": "Dtech",
    "tagline": "Le matériel, présenté avec soin.",
    "search": "Rechercher",
    "searchPlaceholder": "Rechercher dans le catalogue",
    "viewAll": "Voir tout",
    "loading": "Chargement...",
    "error": "Une erreur est survenue",
    "back": "Retour",
    "next": "Suivant",
    "previous": "Précédent",
    "submit": "Envoyer",
    "close": "Fermer",
    "open": "Ouvrir",
    "menu": "Menu",
    "skipToContent": "Aller au contenu"
  },
  "navigation": {
    "home": "Accueil",
    "catalog": "Catalogue",
    "brands": "Marques",
    "categories": "Catégories",
    "about": "À propos",
    "contactDtech": "Contacter Dtech",
    "viewSite": "Voir le site"
  },
  "home": {
    "eyebrow": "DTECH ALGÉRIE · DEPUIS 2006",
    "headline": "Le matériel,",
    "headlineLine2": "présenté",
    "headlineLine3": "avec soin",
    "description": "Un catalogue soigneusement sélectionné d'ordinateurs portables, équipements réseau, mobiles et accessoires des marques HP, Dell, ASUS, TP-Link, et de notre ligne maison D-Tech. Parcourez la vitrine. Contactez-nous lorsque vous trouvez l'équipement qu'il vous faut.",
    "browseCatalog": "Parcourir le catalogue",
    "featuredTitle": "Notre sélection actuelle",
    "featuredSubtitle": "Cinq produits qui méritent votre attention.",
    "brandsTitle": "Cinq marques, choisies avec soin",
    "brandsSubtitle": "Nous distribuons les marques qui répondent à nos standards.",
    "categoriesTitle": "Triées par usage",
    "categoriesSubtitle": "Trouvez selon votre besoin, pas selon notre nomenclature."
  },
  "brands": {
    "pageTitle": "Marques",
    "indexHeading": "Les marques que nous distribuons",
    "indexSubtitle": "Cinq lignes sélectionnées pour leur qualité de fabrication, leurs droits de distribution, et la profondeur de leur gamme.",
    "viewProducts": "Voir les produits"
  },
  "categories": {
    "pageTitle": "Catégories",
    "indexHeading": "Triées par usage",
    "indexSubtitle": "Parcourez le catalogue selon ce que vous recherchez.",
    "viewCategory": "Voir la catégorie"
  },
  "products": {
    "pageTitle": "Produits",
    "specifications": "Caractéristiques",
    "inquireButton": "Demander des informations",
    "relatedProducts": "Produits associés",
    "viewProduct": "Voir le produit",
    "notAvailable": "Non disponible"
  },
  "search": {
    "pageTitle": "Recherche",
    "heading": "Résultats de recherche",
    "placeholder": "Rechercher un produit, une marque, ou une catégorie",
    "resultsFor": "Résultats pour",
    "noResults": "Aucun résultat trouvé",
    "noResultsHint": "Essayez un autre terme ou parcourez directement le catalogue.",
    "tooShort": "La recherche doit contenir au moins 2 caractères"
  },
  "inquiry": {
    "pageTitle": "Demander des informations",
    "heading": "Informations sur",
    "subheading": "Envoyez-nous un message au sujet de ce produit. Nous répondons sous un jour ouvrable.",
    "fullName": "Nom complet",
    "fullNamePlaceholder": "Votre nom complet",
    "email": "E-mail",
    "emailPlaceholder": "vous@exemple.com",
    "phone": "Téléphone",
    "phonePlaceholder": "+213 ...",
    "company": "Entreprise (facultatif)",
    "companyPlaceholder": "Votre entreprise",
    "message": "Message",
    "messagePlaceholder": "Dites-nous ce que vous aimeriez savoir sur ce produit...",
    "submit": "Envoyer la demande",
    "submitting": "Envoi en cours...",
    "sentTitle": "Demande envoyée",
    "sentMessage": "Nous avons bien reçu votre demande et y répondrons sous un jour ouvrable.",
    "sentAction": "Parcourir le catalogue",
    "errors": {
      "required": "Ce champ est requis",
      "invalidEmail": "Veuillez saisir une adresse e-mail valide",
      "messageTooShort": "Le message doit contenir au moins 10 caractères",
      "submitFailed": "Impossible d'envoyer la demande. Veuillez réessayer."
    }
  },
  "about": {
    "pageTitle": "À propos",
    "heading": "À propos de Dtech",
    "establishedSince": "Depuis 2006",
    "introduction": "Dtech est un distributeur de matériel technologique algérien basé à Alger. Nous distribuons du matériel des marques HP, Dell, ASUS, TP-Link, et de notre ligne maison D-Tech, au service des entreprises et particuliers à travers l'Algérie.",
    "approach": "Notre approche",
    "approachBody": "Nous sélectionnons ce que nous distribuons. Nous ne listons pas chaque référence disponible chez chaque fabricant. Nous distribuons les produits que nous recommanderions, et nous présentons chacun avec l'attention qu'il mérite.",
    "contact": "Contact",
    "contactBody": "Pour les demandes produits, utilisez le bouton d'information sur chaque page produit. Pour les partenariats ou les demandes de gros, écrivez-nous directement."
  },
  "footer": {
    "wordmark": "DTECH",
    "tagline": "Le matériel. Présenté avec soin.",
    "copyright": "© {year} Dtech Algérie. Tous droits réservés.",
    "established": "Depuis 2006 · Alger"
  },
  "notFound": {
    "title": "Introuvable",
    "heading": "Page introuvable",
    "description": "La page que vous recherchez n'existe pas ou a été déplacée.",
    "action": "Retour à l'accueil"
  },
  "errors": {
    "title": "Une erreur est survenue",
    "heading": "Erreur",
    "description": "Nous avons été notifiés. Veuillez réessayer ou retourner à la page d'accueil.",
    "retry": "Réessayer",
    "home": "Retour à l'accueil"
  },
  "metadata": {
    "siteName": "Dtech Algérie",
    "defaultTitle": "Dtech — Le matériel, présenté avec soin.",
    "defaultDescription": "Un catalogue soigneusement sélectionné d'ordinateurs portables, équipements réseau, mobiles et accessoires des marques HP, Dell, ASUS, TP-Link, et de notre ligne maison D-Tech.",
    "ogImageAlt": "Dtech Algérie"
  }
}
```

Note for the headline split: "Hardware, / presented / properly" 
becomes three lines for typographic effect. In French, the equivalent 
might not split the same way grammatically. If "Le matériel, / présenté / 
avec soin" feels awkward, that's a judgment call — preserve the 
3-line cinematic intent. Dtech reviews and adjusts during UAT.

================================================================
TASK 4 — MIDDLEWARE UPDATES
================================================================

The existing middleware.ts protects /admin/*. We need to:
1. Keep the admin protection
2. Add locale handling for customer routes
3. NOT touch /admin paths

Open src/middleware.ts. Replace with:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { auth } from '@/lib/auth'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Admin routes: protect with auth, do NOT apply locale routing
  if (pathname.startsWith('/admin')) {
    const session = await auth.api.getSession({
      headers: request.headers,
    }).catch(() => null)
    
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    return NextResponse.next()
  }
  
  // Auth-adjacent routes (not localized): pass through
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }
  
  // API routes: pass through (not localized)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Customer-facing routes: apply locale middleware
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Match everything EXCEPT static assets, _next, favicon
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
}
```

================================================================
TASK 5 — RESTRUCTURE CUSTOMER ROUTES
================================================================

Move all customer-facing routes under src/app/[locale]/.

Current structure (customer routes — DO NOT touch /admin or /api/auth):
```
src/app/
  page.tsx                       (home)
  brands/
    page.tsx
    [brandSlug]/
      page.tsx
      opengraph-image.tsx
  categories/
    page.tsx
    [categorySlug]/
      page.tsx
      opengraph-image.tsx
  products/
    [productSlug]/
      page.tsx
      opengraph-image.tsx
  search/
    page.tsx
  inquiry/
    [productSlug]/
      page.tsx
    sent/
      page.tsx
  about/
    page.tsx
  layout.tsx                     (root layout)
  not-found.tsx
  error.tsx
  loading.tsx
  sitemap.ts
  robots.ts
  opengraph-image.tsx            (root OG)
```

Target structure:
```
src/app/
  [locale]/
    page.tsx                     (home — moved from root)
    layout.tsx                   (locale-aware layout)
    not-found.tsx                (locale-aware 404)
    error.tsx                    (locale-aware error)
    loading.tsx
    brands/
      page.tsx
      [brandSlug]/
        page.tsx
        opengraph-image.tsx
    categories/
      page.tsx
      [categorySlug]/
        page.tsx
        opengraph-image.tsx
    products/
      [productSlug]/
        page.tsx
        opengraph-image.tsx
    search/
      page.tsx
    inquiry/
      [productSlug]/
        page.tsx
      sent/
        page.tsx
    about/
      page.tsx
    opengraph-image.tsx          (locale-aware OG)
  layout.tsx                     (minimal root — just html/body)
  sitemap.ts                     (now generates per-locale entries)
  robots.ts                      (unchanged)
  admin/                         (UNCHANGED — admin stays at /admin)
  api/                           (UNCHANGED)
  login/                         (UNCHANGED — auth not localized)
  forgot-password/               (UNCHANGED)
  reset-password/                (UNCHANGED)
```

For each moved page file, you need to:
1. Move the file to new location
2. Update generateMetadata / metadata to use translations
3. Update internal navigation Links to use next-intl's Link helper
4. Update any useRouter or usePathname imports to next-intl versions
5. Wrap server components that need translations with appropriate API

The exact moves are mechanical but tedious. Use git mv or just create 
new + delete old.

================================================================
TASK 6 — LAYOUT UPDATES
================================================================

Update src/app/layout.tsx to be MINIMAL — just the html shell. next-intl 
needs the locale-aware layout to live in [locale]:

```tsx
import './globals.css'
import type { Metadata } from 'next'
import { display, body, mono } from '@/lib/fonts'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased bg-surface-base text-text-primary" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

The `<html lang="...">` attribute is now set by the [locale] layout.

Create src/app/[locale]/layout.tsx (the real customer layout, 
locale-aware):

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SkipToContent } from '@/components/layout/SkipToContent'
import { locales, isValidLocale, type Locale } from '@/i18n/config'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params
  
  if (!isValidLocale(locale)) notFound()
  
  setRequestLocale(locale)
  
  const messages = await getMessages()
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SkipToContent />
      <ScrollProvider>
        <SiteHeader />
        <main id="main" className="relative">
          {children}
        </main>
        <SiteFooter />
      </ScrollProvider>
    </NextIntlClientProvider>
  )
}
```

================================================================
TASK 7 — UPDATE COMPONENTS WITH TRANSLATIONS
================================================================

This is the bulk of the work. Every customer-facing component that 
renders user-visible text needs translation calls.

For Server Components:
```tsx
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('home')
  return <h1>{t('headline')}</h1>
}
```

For Client Components:
```tsx
'use client'
import { useTranslations } from 'next-intl'

export function ClientThing() {
  const t = useTranslations('navigation')
  return <button>{t('contactDtech')}</button>
}
```

Audit and update these components (find via grep for hardcoded English):

1. src/components/layout/SiteHeader.tsx — nav links use 
   useTranslations('navigation')
2. src/components/layout/SiteFooter.tsx — useTranslations('footer'), 
   with current year via {{year}} placeholder
3. src/components/layout/SkipToContent.tsx — uses 'common.skipToContent'
4. src/components/layout/MobileNav.tsx — useTranslations('navigation')
5. src/app/[locale]/page.tsx — home with all 'home' namespace strings
6. src/app/[locale]/brands/page.tsx — getTranslations('brands')
7. src/app/[locale]/brands/[brandSlug]/page.tsx — uses brand FR fields 
   + 'brands' namespace
8. src/app/[locale]/categories/page.tsx — getTranslations('categories')
9. src/app/[locale]/categories/[categorySlug]/page.tsx — same pattern
10. src/app/[locale]/products/[productSlug]/page.tsx — uses product FR 
    fields + 'products' namespace
11. src/app/[locale]/search/page.tsx — getTranslations('search')
12. src/app/[locale]/inquiry/[productSlug]/page.tsx — 'inquiry' namespace
13. src/app/[locale]/inquiry/sent/page.tsx — 'inquiry' namespace
14. src/app/[locale]/about/page.tsx — 'about' namespace
15. src/app/[locale]/not-found.tsx — 'notFound' namespace
16. src/components/forms/InquiryForm.tsx — 'inquiry.errors' + form labels

Pattern for each: import getTranslations or useTranslations, call with 
namespace, replace hardcoded strings with t() calls.

For internal navigation links, replace next/link imports with 
next-intl's Link from src/i18n/routing.ts:

```tsx
// Before
import Link from 'next/link'

// After
import { Link } from '@/i18n/routing'
```

This ensures all internal links automatically prefix with the active 
locale.

================================================================
TASK 8 — UPDATE QUERIES TO READ _fr WITH FALLBACK
================================================================

Open src/server/queries.ts (and any other customer-facing query files).

For each query that fetches product/brand/category data, add a locale 
parameter and select the appropriate columns with COALESCE-like 
fallback logic.

Pattern using Drizzle's SQL helpers:

```typescript
import { sql } from 'drizzle-orm'
import type { Locale } from '@/i18n/config'

export async function getProductBySlug(slug: string, locale: Locale = 'en') {
  const result = await db
    .select({
      id: products.id,
      slug: products.slug,
      // Use FR if locale is fr AND fr field is not null, else EN
      name: locale === 'fr'
        ? sql<string>`COALESCE(${products.nameFr}, ${products.name})`.as('name')
        : products.name,
      tagline: locale === 'fr'
        ? sql<string>`COALESCE(${products.taglineFr}, ${products.tagline})`.as('tagline')
        : products.tagline,
      description: locale === 'fr'
        ? sql<string>`COALESCE(${products.descriptionFr}, ${products.description})`.as('description')
        : products.description,
      cardSpec: locale === 'fr'
        ? sql<string>`COALESCE(${products.cardSpecFr}, ${products.cardSpec})`.as('card_spec')
        : products.cardSpec,
      searchKeywords: locale === 'fr'
        ? sql<string>`COALESCE(${products.searchKeywordsFr}, ${products.searchKeywords})`.as('search_keywords')
        : products.searchKeywords,
      // Non-localized fields
      brandId: products.brandId,
      categoryId: products.categoryId,
      tier: products.tier,
      featured: products.featured,
      sortOrder: products.sortOrder,
      cardImagePath: products.cardImagePath,
      heroImagePath: products.heroImagePath,
      specs: products.specs,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      archivedAt: products.archivedAt,
    })
    .from(products)
    .where(and(eq(products.slug, slug), isNull(products.archivedAt)))
    .limit(1)
    .then((rows) => rows[0])
  
  return result
}
```

Apply this pattern to all customer-facing queries:
- getProductBySlug
- getProductsByBrand
- getProductsByCategory
- getFeaturedProducts
- getRelatedProducts
- searchProducts
- getAllBrands
- getBrandBySlug
- getAllCategories
- getCategoryBySlug

Each caller (page components) passes the current locale:

```tsx
import { getLocale } from 'next-intl/server'

export default async function ProductPage({ params }) {
  const locale = await getLocale() as Locale
  const product = await getProductBySlug(params.slug, locale)
  ...
}
```

For search queries, search both EN and FR columns:
```typescript
or(
  ilike(products.name, pattern),
  ilike(products.nameFr, pattern),  // also match FR names
  // ... etc
)
```

================================================================
TASK 9 — SITEMAP UPDATES
================================================================

Update src/app/sitemap.ts to emit entries for both locales:

```typescript
import type { MetadataRoute } from 'next'
import { db } from '@/db/client'
import { products, brands, categories } from '@/db/schema'
import { isNull, asc, eq } from 'drizzle-orm'
import { locales } from '@/i18n/config'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all visible content
  const [productList, brandList, categoryList] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(isNull(products.archivedAt))
      .orderBy(asc(products.sortOrder)),
    db.select({ slug: brands.slug, updatedAt: brands.updatedAt })
      .from(brands)
      .where(isNull(brands.archivedAt)),
    db.select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(isNull(categories.archivedAt)),
  ])
  
  const staticPaths = ['', '/about', '/brands', '/categories', '/search']
  
  const entries: MetadataRoute.Sitemap = []
  
  // Per-locale entries with alternates
  for (const locale of locales) {
    // Static paths
    for (const path of staticPaths) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${path}`])
          ),
        },
      })
    }
    
    // Brands
    for (const brand of brandList) {
      entries.push({
        url: `${SITE_URL}/${locale}/brands/${brand.slug}`,
        lastModified: brand.updatedAt ?? new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}/brands/${brand.slug}`])
          ),
        },
      })
    }
    
    // Categories
    for (const category of categoryList) {
      entries.push({
        url: `${SITE_URL}/${locale}/categories/${category.slug}`,
        lastModified: category.updatedAt ?? new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}/categories/${category.slug}`])
          ),
        },
      })
    }
    
    // Products
    for (const product of productList) {
      entries.push({
        url: `${SITE_URL}/${locale}/products/${product.slug}`,
        lastModified: product.updatedAt ?? new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}/products/${product.slug}`])
          ),
        },
      })
    }
  }
  
  return entries
}
```

================================================================
TASK 10 — OG IMAGE GENERATORS PER LOCALE
================================================================

Update each opengraph-image.tsx to be locale-aware. The route file 
sits at:
- src/app/[locale]/opengraph-image.tsx (root)
- src/app/[locale]/brands/[brandSlug]/opengraph-image.tsx
- src/app/[locale]/categories/[categorySlug]/opengraph-image.tsx
- src/app/[locale]/products/[productSlug]/opengraph-image.tsx

For each, access params.locale and call getProductBySlug(slug, locale) 
to get localized content. The OG image's rendered text reflects 
the locale.

For the root OG, use the locale's metadata.defaultTitle and 
metadata.defaultDescription from messages.

================================================================
TASK 11 — LOCALE-AWARE ERROR + NOT-FOUND
================================================================

Move src/app/not-found.tsx → src/app/[locale]/not-found.tsx with 
translations:

```tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/admin/ui/Button'  // reuse for consistency

export default async function NotFound() {
  const t = await getTranslations('notFound')
  
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          404
        </p>
        <h1 className="font-display text-3xl text-text-primary tracking-tight">
          {t('heading')}<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-base text-text-secondary mt-3">
          {t('description')}
        </p>
        <Link href="/" className="inline-block mt-6">
          <span className="font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent">
            {t('action')} →
          </span>
        </Link>
      </div>
    </div>
  )
}
```

Same pattern for src/app/[locale]/error.tsx.

For routes that don't match any locale (e.g., user types /xyz/products), 
keep src/app/not-found.tsx at root as a minimal fallback in English.

================================================================
TASK 12 — LOCALE SWITCHER
================================================================

Create src/components/layout/LocaleSwitcher.tsx:

```tsx
'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useTransition } from 'react'
import { locales, localeNames, type Locale } from '@/i18n/config'

export function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  
  function switchTo(newLocale: Locale) {
    if (newLocale === locale) return
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale })
    })
  }
  
  return (
    <div className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-muted">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            disabled={isPending}
            className={
              l === locale
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary transition-colors'
            }
            aria-current={l === locale ? 'true' : undefined}
            aria-label={`Switch to ${localeNames[l]}`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
```

Add to SiteHeader. Place to the right of the nav, before "Contact Dtech":

```tsx
// In SiteHeader, find the right-side actions area:
<LocaleSwitcher />
<Link href="/inquiry">
  {t('contactDtech')} →
</Link>
```

================================================================
TASK 13 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Smoke tests on both locales:

  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

English routes (all 200):
  $en = @(
    '/en',
    '/en/brands',
    '/en/brands/hp',
    '/en/categories',
    '/en/categories/laptops',
    '/en/products/hp-omen-16-i9-rtx-4070',
    '/en/search?q=laptop',
    '/en/about',
    '/en/inquiry/sent'
  )
  foreach ($r in $en) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

French routes (all 200):
  $fr = @(
    '/fr',
    '/fr/brands',
    '/fr/brands/hp',
    '/fr/categories',
    '/fr/categories/laptops',
    '/fr/products/hp-omen-16-i9-rtx-4070',
    '/fr/search?q=laptop',
    '/fr/about',
    '/fr/inquiry/sent'
  )
  foreach ($r in $fr) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch { Write-Host "ERROR $r" }
  }

Root redirect:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
  Write-Host "Root status: $($res.StatusCode)"
  # Expected: 307 to /en (or /fr if Accept-Language matches)

Admin routes unchanged:
  $admin = @('/admin', '/admin/products', '/admin/inquiries')
  foreach ($r in $admin) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch { Write-Host "Redirect 307 $r (admin)" }
  }

Auth routes unchanged:
  $auth = @('/login', '/forgot-password')
  foreach ($r in $auth) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r (auth)"
    } catch { Write-Host "ERROR $r" }
  }

Sitemap:
  $res = Invoke-WebRequest -Uri "http://localhost:3000/sitemap.xml" -UseBasicParsing -TimeoutSec 10
  Write-Host "Sitemap: $($res.StatusCode) ($($res.Content.Length) bytes)"

Stop:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 14 — COMMIT
================================================================

git add .
git commit -m "feat: phase 8 — internationalization (EN + FR)

NEW DEPENDENCIES:
- next-intl — App Router i18n

I18N INFRASTRUCTURE:
- src/i18n/config.ts — locale list, default, type-safe validation 
  (architected to extend to 'ar' in Phase 11)
- src/i18n/request.ts — server-side message loading
- src/i18n/routing.ts — navigation helpers with locale prefix
- messages/en.json + messages/fr.json — all UI strings extracted, 
  FR generated initially (Dtech review during launch UAT)

ROUTE RESTRUCTURE:
- All customer routes moved to src/app/[locale]/...
- /en is default, /fr is alternate
- localePrefix: 'always' (every URL has /en or /fr)
- Admin routes UNCHANGED at /admin/* (English-only)
- Auth routes UNCHANGED at /login, /forgot-password, /reset-password
- API routes UNCHANGED at /api/*
- Root / redirects via next-intl middleware (Accept-Language sensitive)

MIDDLEWARE:
- Composes admin auth protection + next-intl locale routing
- Admin routes bypass locale middleware
- Auth + API routes bypass locale middleware
- Customer routes get locale detection + redirection

LAYOUTS:
- Root layout: minimal html/body shell + Vercel Analytics/Speed Insights
- [locale] layout: NextIntlClientProvider + SiteHeader/Footer + ScrollProvider
- generateStaticParams for SSG of locale variants

QUERY UPDATES:
- All customer-facing queries accept locale parameter
- _fr columns read with COALESCE fallback to EN when null
- Search queries match across both EN and FR columns

SEO:
- Sitemap emits per-locale entries with hreflang alternates
- OG images localized per locale via params.locale lookup
- Metadata uses messages.metadata.* for default title/description

UI:
- LocaleSwitcher in SiteHeader (EN | FR toggle)
- All hardcoded strings replaced with t() calls
- not-found.tsx and error.tsx localized
- Customer-facing buttons, labels, error messages all translated

OUT OF SCOPE (Phase 11+):
- Arabic (RTL) support — architected to add but not implemented
- Currency / number localization
- Admin UI translations (admin stays English)

DEFERRED FOR LAUNCH UAT:
- Dtech review of generated FR translations
- Adjust any awkward FR phrasing during pre-launch testing"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes (both checkpoints)
- [ ] pnpm build succeeds
- [ ] next-intl installed
- [ ] messages/en.json and messages/fr.json both complete
- [ ] All customer routes accessible at /en/... and /fr/...
- [ ] / redirects to /en (or /fr based on Accept-Language)
- [ ] Admin routes UNCHANGED at /admin/*
- [ ] Auth routes UNCHANGED
- [ ] Sitemap.xml emits per-locale entries with hreflang
- [ ] LocaleSwitcher renders in header
- [ ] Public queries read _fr with EN fallback
- [ ] No 500 errors on any locale
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + per-area summary)
2. Files moved (the customer route restructure)
3. Files modified (especially queries.ts and middleware.ts)
4. Build verification outputs
5. Smoke test results (EN routes, FR routes, root redirect, admin unchanged, sitemap)
6. Any deviations from spec
7. Final commit hash
8. Notes for Dtech UAT review of FR translations

================================================================
DO NOT
================================================================

- Add Arabic support (Phase 11)
- Add RTL layout system
- Translate admin UI
- Add currency localization
- Modify v2 brand spec or admin tool
- Modify auth flow
- Modify Phase 5 components (shader hero, scroll choreography) 
  beyond translation calls
- Add new dependencies beyond next-intl
- Touch /motion or (dev) routes
- Refactor existing customer components beyond translation extraction

================================================================
FAILURE MODES TO WATCH
================================================================

- If next-intl 4.x API differs from spec examples: the spec uses 4.x 
  patterns (defineRouting, createNavigation, requestLocale, etc.). If 
  version 3.x is installed, those APIs differ. Confirm `pnpm list 
  next-intl` shows 4.x. If 3.x, refer to next-intl 3.x docs.

- If middleware's intlMiddleware doesn't run on /: confirm the 
  matcher allows it. The pattern '/((?!_next|_vercel|.*\\..*).*)' 
  matches everything except static. Root / should match.

- If hydration mismatch on locale-dependent rendering: ensure 
  NextIntlClientProvider wraps children in the [locale]/layout.tsx, 
  and that messages are passed to it. Mismatches usually come from 
  rendering t() values server-side without the provider matching.

- If admin/login routes break: confirm middleware passes them 
  through. The matcher should still match them, but the handler 
  explicitly excludes them from intlMiddleware.

- If product/brand/category pages 404 in /fr: confirm the locale 
  param is being passed to queries. The page component should call 
  getLocale() server-side and pass to query function.

- If 'use client' components fail with "useTranslations called 
  outside provider": confirm NextIntlClientProvider wraps the entire 
  [locale] subtree. Server components don't need the provider 
  (they use getTranslations directly), but client components do.

- If sitemap URLs are duplicated: each (locale, slug) combination 
  should appear once with proper hreflang alternates. If you see 
  duplicates, the loop logic is wrong.

- If next-intl/plugin import fails: check next.config.ts. The 
  withNextIntl wrapper must be applied to the export. If the config 
  uses TypeScript module syntax, ensure import + wrap pattern works.

- If LocaleSwitcher doesn't preserve current path: useRouter and 
  usePathname from next-intl handle this. Don't use next/navigation 
  for these — that bypasses locale handling.

- If "specs" JSONB rendering breaks: specs are not localized in 
  Phase 8 (out of scope). If you want to localize spec keys later, 
  that's Phase 11+. For now, render as-is.

- If Vercel Speed Insights / Analytics break: they're in the root 
  layout, which is unchanged. If they error, check imports.

- If `useFormatter` or date formatting is needed but not configured: 
  next-intl provides `getFormatter` server-side. We're not using 
  date formatting in customer UI (only in admin), so this shouldn't 
  matter — but if it does, configure the formats option in i18n/request.ts.

- If COALESCE in queries returns wrong type: Drizzle's sql<string> 
  cast should give string. If you see Date or null types appearing, 
  the column types may be inferred differently. Verify each query's 
  return type after Phase 8 changes.

- If existing 'use client' components import Link from 'next/link': 
  these need to switch to '@/i18n/routing'. Audit all customer 
  components.

================================================================
NOTES FOR THE USER AFTER PHASE 8 LANDS
================================================================

1. The FR translations in messages/fr.json are Claude-generated. 
   Have Dtech review and edit them before launch. Common areas 
   to scrutinize:
   - "Le matériel, présenté avec soin" — does this carry the right 
     tone for Dtech?
   - Product inquiry language — "Demander des informations" vs 
     alternatives
   - The 3-line headline split — does the FR equivalent flow 
     typographically?

2. Bilingual product content was created in Phase 7c. Customer-facing 
   FR product names/taglines/descriptions only appear on /fr/... 
   routes when Dtech enters them in the admin (or when the EN field 
   exists as fallback).

3. The locale switcher in the header swaps current path between 
   /en/X and /fr/X — preserves user's context.

4. Future Arabic support (Phase 11): add 'ar' to locales array in 
   src/i18n/config.ts, create messages/ar.json, add _ar columns to 
   DB. Most of the work is RTL UI adaptation which Phase 11 will 
   handle properly.