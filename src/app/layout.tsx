import type { Metadata } from 'next'
import { displayFont, bodyFont, monoFont } from '@/lib/fonts'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import './globals.css'

export const metadata: Metadata = {
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
        <ScrollProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ScrollProvider>
      </body>
    </html>
  )
}
