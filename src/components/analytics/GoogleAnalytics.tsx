'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

/**
 * GA4 loader.
 *
 * `strategy="afterInteractive"` keeps gtag off the critical path — it loads
 * after hydration, so it can't delay first paint or LCP. The measurement id
 * comes from admin (app_settings), so swapping properties needs no redeploy.
 *
 * `send_page_view` is disabled and page_view is fired manually: this is an
 * App Router SPA, so gtag's automatic pageview only ever sees the first URL.
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      {/* Rendered inline in the RSC output, NOT via next/script.
          `afterInteractive` injects in a useEffect and renders null, and React
          flushes page effects before layout-level ones — so TrackProductView /
          TrackProductList ran while window.gtag was still undefined and their
          events were silently dropped on every direct landing. The stub queues
          into dataLayer, and gtag.js replays the queue once it loads. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false,anonymize_ip:true});`,
        }}
      />
      <Script
        id="ga-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Suspense fallback={null}>
        <PageViews measurementId={measurementId} />
      </Suspense>
    </>
  )
}

/**
 * Reads searchParams, so it must sit inside <Suspense> — otherwise it opts
 * the whole tree out of static rendering.
 */
function PageViews({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    const path = qs ? `${pathname}?${qs}` : pathname
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: measurementId,
    })
  }, [pathname, searchParams, measurementId])

  return null
}
