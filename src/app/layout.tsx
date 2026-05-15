import type { Metadata } from 'next'
import { displayFont, bodyFont, monoFont } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dtech Showroom',
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
        {children}
      </body>
    </html>
  )
}
