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
import { edT, type EdLang } from './editorial-i18n'

interface EdCtxValue {
  lang: EdLang
  dir: 'ltr' | 'rtl'
  t: (key: string) => string
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
}: {
  locale: string
  children: ReactNode
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
    () => ({ lang, dir, t: (k: string) => edT(lang, k), rootRef }),
    [lang, dir]
  )

  return (
    <EdCtx.Provider value={value}>
      <div ref={rootRef} className="editorial-root" lang={lang} dir={dir} data-tone="light">
        {children}
      </div>
    </EdCtx.Provider>
  )
}
