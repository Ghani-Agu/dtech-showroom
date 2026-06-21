'use client'

/**
 * Applies the site-wide visual theme to the public site by setting
 * `body[data-site-theme="<id>"]` (the palette lives in site-themes.css). For
 * non-default themes it also sets the light/dark base (`data-home-theme`) to
 * the theme's mode so the existing light/dark surface styling applies. The
 * default 'nightline' leaves `data-home-theme` to the manual toggle.
 */
import { useEffect } from 'react'

const DARK_THEMES = new Set(['nightline', 'onyx', 'cyber'])

export function SiteTheme({ theme }: { theme: string }) {
  useEffect(() => {
    const id = theme || 'nightline'
    const b = document.body
    b.dataset.siteTheme = id
    if (id !== 'nightline') {
      b.dataset.homeTheme = DARK_THEMES.has(id) ? 'dark' : 'light'
    }
  }, [theme])
  return null
}
