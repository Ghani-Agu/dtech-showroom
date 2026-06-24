'use client'

/**
 * BrandProvider — the `.brand-root` wrapper for the Brand storefront skin.
 *
 * - Carries `lang`/`dir` from the route (next-intl locale) so the scoped CSS
 *   (`.brand-root[lang="ar"]`, logical properties) applies correctly.
 * - Owns the Brand design's own light/dark toggle (independent of the classic
 *   site theme), set as `data-theme` on the root and persisted to localStorage.
 * - Exposes a tiny translation helper bound to the active language.
 *
 * All Brand CSS is namespaced under `.brand-root`, so nothing here can leak
 * into the classic design or the admin.
 */

import '@/styles/brand-design.css'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { brandT, type BrandLang } from './brand-i18n'

type Theme = 'light' | 'dark'

interface BrandCtxValue {
  lang: BrandLang
  dir: 'ltr' | 'rtl'
  theme: Theme
  setTheme: (t: Theme) => void
  t: (key: string) => string
}

const BrandCtx = createContext<BrandCtxValue | null>(null)

export function useBrand(): BrandCtxValue {
  const ctx = useContext(BrandCtx)
  if (!ctx) throw new Error('useBrand must be used inside <BrandProvider>')
  return ctx
}

const THEME_KEY = 'dtech-brand-theme'

export function BrandProvider({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  const lang = (['fr', 'en', 'ar'].includes(locale) ? locale : 'fr') as BrandLang
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const [theme, setThemeState] = useState<Theme>('light')

  // Restore the saved Brand theme on mount (default light, matching the design).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'light' || saved === 'dark') setThemeState(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<BrandCtxValue>(
    () => ({ lang, dir, theme, setTheme, t: (k: string) => brandT(lang, k) }),
    [lang, dir, theme]
  )

  return (
    <BrandCtx.Provider value={value}>
      <div className="brand-root" lang={lang} dir={dir} data-theme={theme} data-tint="on">
        {children}
      </div>
    </BrandCtx.Provider>
  )
}
