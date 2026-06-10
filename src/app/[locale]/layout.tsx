import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { HideOnHome } from '@/components/layout/HideOnHome'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { locales, isValidLocale } from '@/i18n/config'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) notFound()

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:text-text-primary"
      >
        Skip to content
      </a>
      <ScrollProvider>
        <div
          className="flex min-h-screen flex-col"
          lang={locale}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <HideOnHome>
            <SiteHeader />
          </HideOnHome>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <HideOnHome>
            <SiteFooter />
          </HideOnHome>
        </div>
      </ScrollProvider>
    </NextIntlClientProvider>
  )
}
