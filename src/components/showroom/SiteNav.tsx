'use client'

/**
 * SiteNav — the shared Nightline header used on EVERY page.
 * The homepage mounts it directly inside `.home-showcase-root`
 * (variant="home", section anchors); all other pages mount it through
 * ShowroomShell inside a `.home-showcase-root.hs-chrome` display:contents
 * wrapper (variant="page", locale-aware routes), so one stylesheet
 * (home-showcase.css) drives an identical header everywhere.
 *
 * Includes the global light/dark toggle (body[data-home-theme], persisted
 * as `nl-theme`) and the animated in-header search (expanding input +
 * live results popover backed by /api/search).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import NextLink from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { locales, type Locale } from '@/i18n/config'
import { useCart } from '@/lib/cart'
import '@/components/home/home-showcase.css'
import '@/components/home/site-themes.css'

type Theme = 'dark' | 'light'

/** Global theme — body[data-home-theme] is the source of truth (set
 *  pre-paint by the inline script in the root layout). */
function useGlobalTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage/body hydration after SSR
    setTheme(document.body.dataset.homeTheme === 'light' ? 'light' : 'dark')
  }, [])
  const toggle = () =>
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      document.body.dataset.homeTheme = next
      try {
        window.localStorage.setItem('nl-theme', next)
      } catch {
        /* private mode */
      }
      return next
    })
  return [theme, toggle]
}

export function Logo({ home = false }: { home?: boolean }) {
  const t = useTranslations('showcase.logo')
  const inner = (
    <>
      <span className="logo">D</span>
      <span className="name">
        D-Tech<span className="dot">.</span>
        <small>{t('tagline')}</small>
      </span>
    </>
  )
  return home ? (
    <a href="#top" className="wordmark">
      {inner}
    </a>
  ) : (
    <Link href="/" className="wordmark">
      {inner}
    </Link>
  )
}

function NavLocaleSwitcher() {
  const t = useTranslations('showcase.nav')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  return (
    <span className="lang-switch" role="group" aria-label={t('langAria')}>
      {/* FR first to match the design (config order is en-first) */}
      {[...locales].sort((a, b) => (a === 'fr' ? -1 : b === 'fr' ? 1 : 0)).map((l) => (
        <button
          key={l}
          type="button"
          className={`lang-opt ${l === locale ? 'on' : ''}`}
          onClick={() => {
            if (l !== locale) router.replace(pathname, { locale: l })
          }}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  )
}

/* ─── animated in-header search ──────────────────────────────── */

interface SearchHit {
  slug: string
  name: string
  brand: string
  category: string
  image: string
}

function HeaderSearch() {
  const t = useTranslations('showcase.nav')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // close on outside pointer-down / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // debounced live search
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    setBusy(true)
    const id = window.setTimeout(async () => {
      const mine = ++seq.current
      try {
        const r = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&locale=${locale}`
        )
        const data = (await r.json()) as { results?: SearchHit[] }
        if (mine === seq.current) {
          setHits(data.results ?? [])
          setBusy(false)
        }
      } catch {
        if (mine === seq.current) {
          setHits([])
          setBusy(false)
        }
      }
    }, 220)
    return () => window.clearTimeout(id)
  }, [q, locale])

  const submit = () => {
    const query = q.trim()
    if (query.length < 2) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const showPop = open && q.trim().length >= 2

  return (
    <div className={`hs-search ${open ? 'open' : ''}`} ref={boxRef}>
      <input
        ref={inputRef}
        className="hs-input"
        type="search"
        value={q}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchAria')}
        tabIndex={open ? 0 : -1}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button
        className="icn"
        aria-label={t('searchAria')}
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      {showPop ? (
        <div className="hs-pop" role="listbox" aria-label={t('searchAria')}>
          {hits.length === 0 ? (
            <div className="hs-pop-empty">
              {busy ? '···' : t('searchNoResults')}
            </div>
          ) : (
            <>
              {hits.map((h) => (
                <Link
                  key={h.slug}
                  href={`/products/${h.slug}`}
                  className="hs-hit"
                  onClick={() => {
                    setOpen(false)
                    setQ('')
                  }}
                >
                  <span className="im">
                    <Image src={h.image} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
                  </span>
                  <span className="tx">
                    <span className="nm">{h.name}</span>
                    <span className="meta">
                      {h.brand} · {h.category}
                    </span>
                  </span>
                </Link>
              ))}
              <button type="button" className="hs-all" onClick={submit}>
                {t('searchSeeAll')}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ─── header ─────────────────────────────────────────────────── */

export function SiteNav({ variant }: { variant: 'home' | 'page' }) {
  const t = useTranslations('showcase.nav')
  const tSr = useTranslations('showroom.nav')
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const [theme, toggleTheme] = useGlobalTheme()
  const cartItems = useCart((st) => st.items)
  const openCart = useCart((st) => st.setOpen)
  const [hydrated, setHydrated] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- cart badge renders only after hydration (persisted store)
  useEffect(() => setHydrated(true), [])
  const quoteCount = hydrated ? cartItems.reduce((a, i) => a + i.qty, 0) : 0

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // close the mobile menu on navigation
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on route change
  useEffect(() => setMenu(false), [pathname])

  const routeLinks = [
    { href: '/products' as const, label: t('products') },
    { href: '/categories' as const, label: t('catalogue') },
    { href: '/brands' as const, label: t('brands') },
    { href: '/about' as const, label: t('about'), secondary: true },
    { href: '/inquiry' as const, label: t('contact'), secondary: true },
  ]

  return (
    <header className={scrolled ? 'shrink' : ''}>
      <div className="wrap hdr">
        <Logo home={variant === 'home'} />
        <nav className="primary">
          {variant === 'home' ? (
            <>
              <a href="#categories" className="on">{t('catalogue')}</a>
              <a href="#products">{t('products')}</a>
              <a href="#brands">{t('brands')}</a>
              <a href="#about" data-h="">{t('about')}</a>
              <a href="#contact" data-h="">{t('contact')}</a>
            </>
          ) : (
            routeLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname?.startsWith(l.href) ? 'on' : undefined}
                {...(l.secondary ? { 'data-h': '' } : {})}
              >
                {l.label}
              </Link>
            ))
          )}
        </nav>
        <div className="hdr-right">
          <NavLocaleSwitcher />
          <button
            className="icn theme-toggle"
            aria-label={t('themeAria')}
            title={t('themeAria')}
            aria-pressed={theme === 'light'}
            type="button"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
          <HeaderSearch />
          {/* /login lives outside the locale tree — next/link, not i18n Link */}
          <NextLink className="icn icn-mq" aria-label={t('accountAria')} href="/login">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </NextLink>
          <button
            className="icn"
            aria-label={t('cartAria')}
            type="button"
            onClick={() => openCart(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
            </svg>
            {quoteCount > 0 && <span className="dot" />}
            {quoteCount > 0 && <span className="cart-count">{quoteCount}</span>}
          </button>
          <button
            className="icn icn-burger"
            aria-label={tSr('menu')}
            aria-expanded={menu}
            type="button"
            onClick={() => setMenu(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          {variant === 'home' ? (
            <a className="btn btn-primary btn-explore" href="#products">
              <span className="shimmer" />
              {t('explore')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          ) : (
            <Link className="btn btn-primary btn-explore" href="/products">
              <span className="shimmer" />
              {t('explore')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      {menu
        ? createPortal(
        <div className="home-showcase-root" style={{ display: 'contents' }}>
        <div className="sr-mobile-menu" role="dialog" aria-modal="true">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo home={variant === 'home'} />
            <button
              type="button"
              className="icn"
              style={{ marginInlineStart: 'auto' }}
              aria-label={tSr('close')}
              onClick={() => setMenu(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav>
            <Link href="/" onClick={() => setMenu(false)}>
              {tSr('home')}<span>.</span>
            </Link>
            {routeLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: 24 }}>
            <NavLocaleSwitcher />
          </div>
        </div>
        </div>,
        document.body
        )
        : null}
    </header>
  )
}
