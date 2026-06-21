'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/routing'
import { localeNames, locales, type Locale } from '@/i18n/config'

export function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function switchTo(newLocale: Locale) {
    if (newLocale === locale) return

    // Keep query params (e.g. /search?q=…) when switching language.
    const qs = searchParams.toString()
    const target = qs ? `${pathname}?${qs}` : pathname

    startTransition(() => {
      router.replace(target, { locale: newLocale })
    })
  }

  return (
    <div className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-muted">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            disabled={isPending}
            className={
              l === locale
                ? 'text-text-primary'
                : 'text-text-muted transition-colors hover:text-text-secondary'
            }
            aria-current={l === locale ? 'true' : undefined}
            aria-label={`Switch to ${localeNames[l]}`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
