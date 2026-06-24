import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { ShowroomShell } from '@/components/showroom/ShowroomShell'
import { SiteTheme } from '@/components/site-theme'
import { getSiteTheme, getPublishedDesign } from '@/server/editor-page-data'
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

  const [messages, siteTheme, design] = await Promise.all([
    getMessages(),
    getSiteTheme(),
    getPublishedDesign(),
  ])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SiteTheme theme={siteTheme} />
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
          data-design={design}
        >
          <ShowroomShell design={design}>{children}</ShowroomShell>
        </div>
      </ScrollProvider>
    </NextIntlClientProvider>
  )
}
