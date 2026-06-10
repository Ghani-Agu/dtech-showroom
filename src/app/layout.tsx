import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { displayFont, bodyFont, monoFont } from '@/lib/fonts'
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-surface-base font-body text-text-primary antialiased"
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
