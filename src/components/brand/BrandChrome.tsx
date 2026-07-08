'use client'

/**
 * Brand chrome — Header + Footer, ported from dtech-sections.jsx.
 * Language switch is wired to next-intl routing (route-based locale), and the
 * light/dark toggle uses the Brand theme context. Markup/classes match the
 * scoped brand-design.css.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, usePathname, Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
import { useCart } from '@/lib/cart'
import type { BrandLang } from './brand-i18n'
import { BRAND_LANGS } from './brand-i18n'
import {
  Arrow,
  CartIcon,
  SunIcon,
  MoonIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
} from './brand-icons'

function BrandWordmark() {
  const { t } = useBrand()
  const onHome = usePathname() === '/'
  const inner = (
    <span className="stack">
      <span className="logo">
        <span className="d">d</span>tech<sup>®</sup>
      </span>
      <span className="tag">{t('b.tag')}</span>
    </span>
  )
  return onHome ? (
    <a href="#top" className="brand">{inner}</a>
  ) : (
    <Link href="/" className="brand">{inner}</Link>
  )
}

function LangSwitch() {
  const { lang, t } = useBrand()
  const router = useRouter()
  const pathname = usePathname()
  return (
    <div className="seg" role="group" aria-label={t('ctl.lang')}>
      {BRAND_LANGS.map((l) => (
        <button
          key={l.id}
          className={lang === l.id ? 'on' : ''}
          aria-pressed={lang === l.id}
          onClick={() => router.replace(pathname, { locale: l.id })}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

interface SearchHit {
  slug: string
  name: string
  brand: string
  category: string
  image: string
}

const SEARCH_PH: Record<BrandLang, string> = {
  fr: 'Rechercher un produit…',
  en: 'Search products…',
  ar: 'ابحث عن منتج…',
}
const SEARCH_EMPTY: Record<BrandLang, string> = {
  fr: 'Aucun résultat',
  en: 'No results',
  ar: 'لا نتائج',
}
const SEARCH_ALL: Record<BrandLang, string> = {
  fr: 'Voir tous les résultats →',
  en: 'See all results →',
  ar: '← عرض كل النتائج',
}

/** Expanding live product search (same /api/search as the classic design). */
function HeaderSearch() {
  const { lang } = useBrand()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${lang}`)
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
  }, [q, lang])

  const submit = () => {
    const query = q.trim()
    if (!query) return
    setOpen(false)
    setQ('')
    router.push({ pathname: '/search', query: { q: query } })
  }

  return (
    <div className={`bs ${open ? 'open' : ''}`} ref={boxRef}>
      <input
        ref={inputRef}
        className="bs-input"
        type="search"
        value={q}
        placeholder={SEARCH_PH[lang]}
        aria-label={SEARCH_PH[lang]}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <button
        type="button"
        className="icn bs-btn"
        aria-label={SEARCH_PH[lang]}
        onClick={() => {
          if (!open) {
            setOpen(true)
            window.setTimeout(() => inputRef.current?.focus(), 40)
          } else {
            submit()
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      {open && q.trim().length >= 2 ? (
        <div className="bs-pop" role="listbox" aria-label={SEARCH_PH[lang]}>
          {hits.length === 0 ? (
            <div className="bs-empty">{busy ? '···' : SEARCH_EMPTY[lang]}</div>
          ) : (
            <>
              {hits.map((h) => (
                <Link
                  key={h.slug}
                  href={`/products/${h.slug}`}
                  className="bs-hit"
                  onClick={() => {
                    setOpen(false)
                    setQ('')
                  }}
                >
                  <Image src={h.image} alt="" width={42} height={42} style={{ objectFit: 'contain' }} />
                  <span className="tx">
                    <span className="nm">{h.name}</span>
                    <span className="sub">{h.brand} · {h.category}</span>
                  </span>
                </Link>
              ))}
              <button type="button" className="bs-all" onClick={submit}>
                {SEARCH_ALL[lang]}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function HeaderCartButton() {
  const { t } = useBrand()
  const items = useCart((s) => s.items)
  const setOpen = useCart((s) => s.setOpen)
  const count = items.reduce((a, i) => a + i.qty, 0)
  return (
    <button className="icn cart-icn" aria-label={t('aria.cart')} onClick={() => setOpen(true)}>
      <CartIcon />
      {count > 0 ? <span className="cart-count">{count}</span> : null}
    </button>
  )
}

function ThemeToggle() {
  const { theme, setTheme, t } = useBrand()
  const dark = theme === 'dark'
  return (
    <button
      className="icn"
      aria-label={t('ctl.theme')}
      title={t('ctl.theme')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

/**
 * Nav items. On the homepage they scroll to in-page sections; on inner routes
 * the ones with a real page (`to`) link there, the rest jump back to the
 * homepage section.
 */
function useNavItems() {
  const { t } = useBrand()
  return [
    { label: t('nav.catalogue'), hash: 'products', to: '/products' },
    { label: t('nav.brands'), hash: 'brands', to: '/brands' },
    { label: t('nav.services'), hash: 'services' },
    { label: t('nav.about'), hash: 'about', to: '/about' },
    { label: t('nav.contact'), hash: 'contact' },
  ] as { label: string; hash: string; to?: string }[]
}

export function BrandHeader() {
  const { t, lang } = useBrand()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const items = useNavItems()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`site ${scrolled ? 'shrink' : ''}`}>
      <div className="wrap hdr">
        <BrandWordmark />
        <nav className="primary">
          {items.map((it) => {
            const active = onHome ? it.hash === 'products' : it.to ? pathname.startsWith(it.to) : false
            const cls = active ? 'on' : undefined
            if (onHome) return <a key={it.hash} href={`#${it.hash}`} className={cls}>{it.label}</a>
            if (it.to) return <Link key={it.hash} href={it.to} className={cls}>{it.label}</Link>
            return <a key={it.hash} href={`/${lang}#${it.hash}`} className={cls}>{it.label}</a>
          })}
        </nav>
        <div className="hdr-right">
          <HeaderSearch />
          <LangSwitch />
          <ThemeToggle />
          <HeaderCartButton />
          {onHome ? (
            <a className="btn btn-teal btn-sm" href="#products">
              {t('nav.explore')}
              <Arrow s={13} />
            </a>
          ) : (
            <Link className="btn btn-teal btn-sm" href="/products">
              {t('nav.explore')}
              <Arrow s={13} />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function BrandFooter() {
  const { t } = useBrand()
  return (
    <footer className="site">
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <div className="logo">
              <span className="d">d</span>tech
            </div>
            <div className="tag">{t('b.tag')}</div>
            <p>{t('footer.tagline')}</p>
            <div className="ft-soc">
              <a aria-label="Facebook"><FacebookIcon /></a>
              <a aria-label="Instagram"><InstagramIcon /></a>
              <a aria-label="LinkedIn"><LinkedInIcon /></a>
            </div>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c1')}</h4>
            <ul>
              <li><a>{t('footer.c1a')}</a></li>
              <li><a>{t('footer.c1b')}</a></li>
              <li><a>{t('footer.c1c')}</a></li>
              <li><a>{t('footer.c1d')}</a></li>
              <li><a>{t('footer.c1e')}</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c2')}</h4>
            <ul>
              <li><a>HP · Dell · Lenovo</a></li>
              <li><a>ASUS · TUF Gaming</a></li>
              <li><a>TP-Link</a></li>
              <li><a>Canon · Epson</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c3')}</h4>
            <ul>
              <li><a>{t('footer.c3a')}</a></li>
              <li><a>{t('footer.c3b')}</a></li>
              <li><a>{t('footer.c3c')}</a></li>
              <li><a>{t('footer.c3d')}</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c4')}</h4>
            <ul>
              <li><a>{t('footer.c4a')}</a></li>
              <li><a>0560 99 05 06</a></li>
              <li><a>0561 616 911</a></li>
              <li><a>contact@dtech.dz</a></li>
            </ul>
          </div>
        </div>
        <div className="ft-bottom">
          <span>© 2026 DTECH Algérie · {t('b.tag')}</span>
          <span className="lks">
            <a>{t('footer.legal')}</a>
            <a>{t('footer.cgv')}</a>
            <a>{t('footer.privacy')}</a>
          </span>
          <span>{t('footer.madein')}</span>
        </div>
      </div>
    </footer>
  )
}
