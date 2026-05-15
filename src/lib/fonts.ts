import { Inter, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

export const displayFont = localFont({
  src: '../../public/fonts/GeneralSans-Variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '200 700',
  style: 'normal',
})

export const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
