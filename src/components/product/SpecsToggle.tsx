'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type SpecValue = string | number | string[]

const TONES = {
  dark: {
    panelBg: 'var(--sr-bg, #0b1220)',
    line: 'var(--sr-line, rgba(255,255,255,0.12))',
    text: 'var(--sr-text, #e9eef7)',
    muted: 'var(--sr-mute, #93a4ba)',
    accent: 'var(--sr-cyan, #57d0bf)',
    onAccent: '#04121f',
    btnBg: 'var(--sr-surface, rgba(255,255,255,0.08))',
  },
  light: {
    panelBg: '#ffffff',
    line: 'rgba(18,18,40,0.10)',
    text: 'var(--ink, #16162e)',
    muted: 'var(--muted, #6a6a82)',
    accent: 'var(--accent, #12b3a6)',
    onAccent: '#ffffff',
    btnBg: 'rgba(18,18,40,0.05)',
  },
} as const

export function SpecsToggle({
  specs,
  tone = 'dark',
}: {
  specs?: Record<string, SpecValue> | null
  tone?: 'dark' | 'light'
}) {
  const [open, setOpen] = useState(false)
  const tSpec = useTranslations('products.specLabels')
  const locale = useLocale()
  const entries = Object.entries(specs ?? {})
  if (entries.length === 0) return null
  const c = TONES[tone]
  const title =
    locale === 'ar'
      ? 'المواصفات التقنية'
      : locale === 'en'
        ? 'Technical specifications'
        : 'Caractéristiques techniques'

  return (
    <>
      <button
        type="button"
        aria-label={title}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        style={{
          position: 'absolute',
          top: 10,
          insetInlineEnd: 10,
          zIndex: 5,
          width: 30,
          height: 30,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          background: c.btnBg,
          border: '1px solid ' + c.line,
          color: c.text,
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 7,
            background: c.panelBg,
            border: '1px solid ' + c.line,
            borderRadius: 'inherit',
            padding: '15px 17px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: c.accent, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </span>
            <button
              type="button"
              aria-label="Fermer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                background: c.accent,
                color: c.onAccent,
                border: 'none',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {entries.map(([k, v]) => (
              <li key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  <strong style={{ color: c.text, fontWeight: 600 }}>{tSpec(k)}</strong>{' '}
                  <span style={{ color: c.muted }} dir="ltr">
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
