import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { displayFont, bodyFont, monoFont } from '@/lib/fonts'
import './globals.css'
/**
 * Storefront stylesheet, imported at the ROOT layout.
 *
 * It used to be imported only by ShowroomShell — a `'use client'` component
 * rendered from the [locale] layout — and in a PRODUCTION build Next emitted
 * it into a CSS chunk that no page ever linked. `next dev` injects styles
 * differently and hid this completely, so it only broke once built: /products,
 * /categories/*, /brands/*, /search and every product page shipped with none
 * of their `.sr-*` rules — no max-width, chips rendering as inline text, and
 * the carousels losing `display:flex` so they stacked into one tall column.
 *
 * Importing here guarantees it is linked on every route. It is fully scoped to
 * `.sr-*` / `.sr-root`, so it cannot bleed into the admin.
 */
import '@/styles/showroom.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'
  ),
  title: {
    template: '%s — Dtech',
    default: 'Dtech Showroom — Hardware presented properly',
  },
  description: "Cinematic 3D showroom for Dtech Algérie's product catalog",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <head>
        {/* Nightline homepage typography — matches the design prototype
            (D-Tech - Nightline.html), which loads Inter + JetBrains Mono
            from Google Fonts. Loaded with literal family names so the
            showcase CSS and inline SVG fontFamily references resolve. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Tajawal:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-surface-base font-body text-text-primary antialiased"
      >
        {/* pre-paint theme bootstrap — keeps the light/white mode applied
            on every page without a flash (toggle lives in SiteNav) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('nl-theme')==='light')document.body.dataset.homeTheme='light'}catch(e){}try{if(localStorage.getItem('admin-theme')==='light')document.documentElement.dataset.adminTheme='light'}catch(e){}",
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
