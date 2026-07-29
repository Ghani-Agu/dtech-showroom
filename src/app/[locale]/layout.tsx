import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ScrollProvider } from '@/components/layout/ScrollProvider'
import { ShowroomShell } from '@/components/showroom/ShowroomShell'
import { SiteTheme } from '@/components/site-theme'
import { getSiteTheme, getPublishedDesign } from '@/server/editor-page-data'
import { getNavData } from '@/server/nav-data'
import { NavDataProvider } from '@/components/layout/nav-data'
import { getSiteIntegrations } from '@/lib/site-integrations'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { AiChat } from '@/components/chat/AiChat'
import { NewsletterPopup } from '@/components/showroom/NewsletterPopup'
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

  const [messages, siteTheme, design, integrations, navData] = await Promise.all([
    getMessages(),
    getSiteTheme(),
    getPublishedDesign(),
    getSiteIntegrations(),
    // ROUND 19: categories + brands for the Catalogue mega-menu and the
    // footer. Cheap — every source read is already memoised for the page
    // body that follows, and the projection is a few kB.
    getNavData(locale),
  ])
  const t = await getTranslations('common')

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NavDataProvider value={navData}>
      <SiteTheme theme={siteTheme} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:text-text-primary"
      >
        {t('skipToContent')}
      </a>
      {/* GA first: its inline stub defines window.gtag synchronously, and
          React flushes effects in tree order — mounting it after the page
          would mean every view/search event on a direct landing fired into
          an undefined gtag and was lost. */}
      {integrations.ga.enabled && integrations.ga.measurementId ? (
        <GoogleAnalytics measurementId={integrations.ga.measurementId} />
      ) : null}
      <ScrollProvider>
        <div
          className="flex min-h-screen flex-col"
          lang={locale}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          data-design={design}
        >
          <ShowroomShell design={design}>{children}</ShowroomShell>
          {/* Inside the dir/data-design wrapper (so RTL mirroring and the
              brand palette apply) but OUTSIDE .sr-root — the shell's
              `:has(.brand-root)` guard hides its own direct children on brand
              pages, and .sr-root doesn't exist on the homepage at all. One
              mount covers every storefront route in all three skins, never
              admin.

              ROUND 17: mounted UNCONDITIONALLY. Credentials are handed over
              only when the integration is fully configured AND switched on;
              without them the panel opens in handoff mode (WhatsApp / phone)
              rather than disappearing. A chat icon that lives in three
              headers must not vanish because a settings row is empty — and a
              visitor who clicks it must always reach a human. */}
          <AiChat
            baseUrl={integrations.aiChat.enabled ? integrations.aiChat.baseUrl : null}
            widgetKey={
              integrations.aiChat.enabled ? integrations.aiChat.widgetKey : null
            }
            title={integrations.aiChat.title}
          />
          {/* Round 16: the newsletter capture pop-up — one mount for every
              storefront route in all three skins (auto-open + header
              buttons), never on admin routes. */}
          <NewsletterPopup />
        </div>
      </ScrollProvider>
      </NavDataProvider>
    </NextIntlClientProvider>
  )
}
