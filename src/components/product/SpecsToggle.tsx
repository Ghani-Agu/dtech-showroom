'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type SpecValue = string | number | string[]

/**
 * "Fiche technique" feature on product cards.
 * - variant="inline": full-width row button between the short description and
 *   the card's action buttons — the main variant, used by all skins.
 * - variant="corner": legacy floating button at the top corner of the card.
 *
 * The panel opens as an animated overlay covering the card. All styling lives
 * in showroom.css (.sr-specsbtn / .sr-specspanel — ROUND 13 block) on --sr-*
 * tokens, so the one component follows each skin's palette through the
 * existing `.brand-root` / `.editorial-root` / light-theme token remaps.
 * The `tone` prop is kept for call-site compatibility and exposed as
 * data-tone for skin-specific fine-tuning.
 */
export function SpecsToggle({
  specs,
  tone = 'dark',
  variant = 'corner',
}: {
  specs?: Record<string, SpecValue> | null
  tone?: 'dark' | 'light'
  variant?: 'corner' | 'inline'
}) {
  const [open, setOpen] = useState(false)
  const tSpec = useTranslations('products.specLabels')
  const locale = useLocale()
  const entries = Object.entries(specs ?? {})

  // Escape closes the overlay (it covers the whole card, so make sure
  // keyboard users are never stuck in it).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (entries.length === 0) return null
  const title =
    locale === 'ar'
      ? 'المواصفات التقنية'
      : locale === 'en'
        ? 'Technical specifications'
        : 'Caractéristiques techniques'
  const closeLabel = locale === 'ar' ? 'إغلاق' : locale === 'en' ? 'Close' : 'Fermer'

  const openPanel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
  const closePanel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
  }

  return (
    <>
      {variant === 'inline' ? (
        <button
          type="button"
          className="sr-specsbtn"
          data-tone={tone}
          aria-expanded={open}
          onClick={openPanel}
        >
          <svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h10M4 12h16M4 18h7" />
            <circle cx="17.5" cy="6" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="13.5" cy="18" r="1.6" fill="currentColor" stroke="none" />
          </svg>
          <span className="lb">{title}</span>
          <span className="pl" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="sr-specsbtn-c"
          data-tone={tone}
          aria-label={title}
          aria-expanded={open}
          onClick={openPanel}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="sr-specspanel"
          data-tone={tone}
          role="dialog"
          aria-label={title}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="hd">
            <span className="tt">{title}</span>
            <button type="button" className="cl" aria-label={closeLabel} onClick={closePanel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <ul className="ls">
            {entries.map(([k, v], i) => (
              <li key={k} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  <strong>{tSpec(k)}</strong>{' '}
                  <span className="vl" dir="ltr">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
