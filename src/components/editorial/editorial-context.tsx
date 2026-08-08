'use client'

/**
 * EditorialProvider — `.editorial-root` wrapper for the Éditorial skin.
 * VERBATIM port of the design's reveal plumbing (dtech-ed-parts.jsx):
 *  - every `.rv` element gets `data-revealed` when it enters the viewport
 *    (threshold .12, rootMargin -8% bottom — the design's useReveal numbers);
 *  - `.ed-motion` is added on mount so SSR/no-JS renders everything visible;
 *  - prefers-reduced-motion reveals instantly (CSS also hard-disables).
 * The chrome (PillNav/EdCursor) sets `data-tone` / cursor classes on this
 * same root element via `rootRef`.
 */

import '@/styles/editorial-design.css'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { edT, edTf, type EdLang } from './editorial-i18n'
import { resolveText, type EdText } from '@/lib/ed-editor/model'

interface EdCtxValue {
  lang: EdLang
  dir: 'ltr' | 'rtl'
  t: (key: string) => string
  /** Round 19: `t` with `{placeholder}` interpolation, for the brand pages. */
  tf: (key: string, vars: Record<string, string | number>) => string
  rootRef: RefObject<HTMLDivElement | null>
}

const EdCtx = createContext<EdCtxValue | null>(null)

export function useEditorial(): EdCtxValue {
  const ctx = useContext(EdCtx)
  if (!ctx) throw new Error('useEditorial must be used inside <EditorialProvider>')
  return ctx
}

export function EditorialProvider({
  locale,
  children,
  text,
}: {
  locale: string
  children: ReactNode
  /**
   * Surcharges de texte publiées depuis l'éditeur, rangées par clé i18n.
   * Elles passent par `t`/`tf`, donc TOUT le texte de la peau devient
   * éditable sans qu'une seule section ait à être modifiée — et une clé
   * jamais touchée garde sa traduction d'origine.
   */
  text?: Record<string, EdText>
}) {
  const lang = (['fr', 'en', 'ar'].includes(locale) ? locale : 'fr') as EdLang
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('ed-motion')

    const targets = root.querySelectorAll<HTMLElement>('.rv')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-revealed', ''))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute('data-revealed', '')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const value = useMemo<EdCtxValue>(
    () => ({
      lang,
      dir,
      t: (k: string) => resolveText(k, lang, edT(lang, k), text),
      tf: (k: string, vars: Record<string, string | number>) => {
        const raw = resolveText(k, lang, '', text)
        if (!raw) return edTf(lang, k, vars)
        return raw.replace(/\{(\w+)\}/g, (m, v: string) =>
          vars[v] === undefined ? m : String(vars[v]),
        )
      },
      rootRef,
    }),
    [lang, dir, text]
  )

  return (
    <EdCtx.Provider value={value}>
      <div ref={rootRef} className="editorial-root" lang={lang} dir={dir} data-tone="light">
        {children}
      </div>
    </EdCtx.Provider>
  )
}
