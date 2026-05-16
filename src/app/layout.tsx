import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { displayFont, bodyFont, monoFont } from '@/lib/fonts'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import './globals.css'

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
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased bg-surface-base text-text-primary font-body`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:text-text-primary"
        >
          Skip to content
        </a>
        <ScrollProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </ScrollProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
