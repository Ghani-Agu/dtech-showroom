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
import { useNlPopup } from '@/lib/newsletter-popup'
import { useChatPanel } from '@/lib/chat-panel'
import { useFocusTrap } from '@/hooks/useFocusTrap'
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
import { BRAND_WHATSAPP } from './brand-types'
import { FooterNewsletter } from '@/components/forms/FooterNewsletter'

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
        <div className="bs-pop" aria-label={SEARCH_PH[lang]}>
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

/* ROUND 16 — newsletter pop-up trigger (no customer accounts). */
const NL_LABEL: Record<BrandLang, string> = {
  fr: 'Newsletter',
  en: 'Newsletter',
  ar: 'النشرة البريدية',
}

function HeaderNewsletterButton() {
  const { lang } = useBrand()
  const setOpen = useNlPopup((s) => s.setOpen)
  return (
    <button
      className="icn"
      type="button"
      aria-label={NL_LABEL[lang]}
      title={NL_LABEL[lang]}
      onClick={() => setOpen(true)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    </button>
  )
}

/* ROUND 17 — D-Tech AI assistant trigger (same store as the floating bubble). */
const CHAT_LABEL: Record<BrandLang, string> = {
  fr: 'Assistant D-Tech',
  en: 'D-Tech Assistant',
  ar: 'مساعد D-Tech',
}

function BotGlyph({ s = 18 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="7.5" width="17" height="12" rx="4" />
      <path d="M12 7.5V4.4M9.6 13h.01M14.4 13h.01M9.6 16.3c1.5.8 3.3.8 4.8 0" />
      <circle cx="12" cy="3.1" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HeaderChatButton() {
  const { lang } = useBrand()
  const setOpen = useChatPanel((s) => s.setOpen)
  return (
    <button
      className="icn"
      type="button"
      aria-label={CHAT_LABEL[lang]}
      title={CHAT_LABEL[lang]}
      onClick={() => setOpen(true)}
    >
      <BotGlyph s={18} />
    </button>
  )
}

/** Anchor (not button) so the mobile menu's `nav a` styling applies. */
function MobileChatLink({ onDone }: { onDone: () => void }) {
  const { lang } = useBrand()
  const setOpen = useChatPanel((s) => s.setOpen)
  return (
    <a
      href="#chat"
      onClick={(e) => {
        e.preventDefault()
        onDone()
        setOpen(true)
      }}
    >
      {CHAT_LABEL[lang]}
    </a>
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

/** Anchor (not button) so the mobile menu's `nav a` styling applies. */
function MobileNewsletterLink({ onDone }: { onDone: () => void }) {
  const { lang } = useBrand()
  const setOpen = useNlPopup((s) => s.setOpen)
  return (
    <a
      href="#newsletter"
      onClick={(e) => {
        e.preventDefault()
        onDone()
        setOpen(true)
      }}
    >
      {NL_LABEL[lang]}
    </a>
  )
}

export function BrandHeader() {
  const { t, lang } = useBrand()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const items = useNavItems()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu on route change
  useEffect(() => setMenuOpen(false), [pathname])
  const menuTrapRef = useFocusTrap<HTMLDivElement>(menuOpen, () => setMenuOpen(false))
  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const menuLabel = lang === 'ar' ? 'القائمة' : 'Menu'
  const closeLabel = lang === 'ar' ? 'إغلاق' : lang === 'fr' ? 'Fermer' : 'Close'

  const renderNavLink = (
    it: { label: string; hash: string; to?: string },
    onClick?: () => void,
  ) => {
    const active = onHome ? it.hash === 'products' : it.to ? pathname.startsWith(it.to) : false
    const cls = active ? 'on' : undefined
    if (onHome) return <a key={it.hash} href={`#${it.hash}`} className={cls} onClick={onClick}>{it.label}</a>
    if (it.to) return <Link key={it.hash} href={it.to} prefetch className={cls} onClick={onClick}>{it.label}</Link>
    return <a key={it.hash} href={`/${lang}#${it.hash}`} className={cls} onClick={onClick}>{it.label}</a>
  }

  return (
    <>
      <header className={`site ${scrolled ? 'shrink' : ''}`}>
        <div className="wrap hdr">
          <BrandWordmark />
          <nav className="primary">{items.map((it) => renderNavLink(it))}</nav>
          <div className="hdr-right">
            <HeaderSearch />
            <LangSwitch />
            <ThemeToggle />
            <HeaderChatButton />
            <HeaderNewsletterButton />
            <HeaderCartButton />
            <button
              type="button"
              className="icn b-burger"
              aria-label={menuLabel}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            {onHome ? (
              <a className="btn btn-teal btn-sm b-explore" href="#products">
                {t('nav.explore')}
                <Arrow s={13} />
              </a>
            ) : (
              <Link className="btn btn-teal btn-sm b-explore" href="/products">
                {t('nav.explore')}
                <Arrow s={13} />
              </Link>
            )}
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div ref={menuTrapRef} className="b-mobile" role="dialog" aria-modal="true" aria-label={menuLabel}>
          <div className="b-mobile-head">
            <BrandWordmark />
            <button type="button" className="icn" aria-label={closeLabel} onClick={() => setMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav className="b-mobile-nav">
            {items.map((it) => renderNavLink(it, () => setMenuOpen(false)))}
            <MobileChatLink onDone={() => setMenuOpen(false)} />
            <MobileNewsletterLink onDone={() => setMenuOpen(false)} />
          </nav>
          <div className="b-mobile-foot">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </>
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
              <a aria-label="Facebook" href="https://www.facebook.com/DtechDZ/" target="_blank" rel="noopener noreferrer"><FacebookIcon /></a>
              <a aria-label="Instagram" href="https://www.instagram.com/dtechdz/" target="_blank" rel="noopener noreferrer"><InstagramIcon /></a>
              <a aria-label="LinkedIn" href="https://www.linkedin.com/company/d-techalgerie" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
            </div>
            <FooterNewsletter source="footer-brand" />
          </div>
          <div className="ft-col">
            <h4>{t('footer.c1')}</h4>
            <ul>
              <li><Link href={{ pathname: '/products', query: { category: 'desktops' } }}>{t('footer.c1a')}</Link></li>
              <li><Link href={{ pathname: '/products', query: { category: 'laptops' } }}>{t('footer.c1b')}</Link></li>
              <li><Link href={{ pathname: '/products', query: { category: 'all-in-one' } }}>{t('footer.c1c')}</Link></li>
              <li><Link href={{ pathname: '/products', query: { category: 'tablets' } }}>{t('footer.c1d')}</Link></li>
              <li><Link href={{ pathname: '/products', query: { category: 'printers' } }}>{t('footer.c1e')}</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c2')}</h4>
            <ul>
              <li><Link href={{ pathname: '/products', query: { brand: 'hp' } }}>HP · Dell · Lenovo</Link></li>
              <li><Link href={{ pathname: '/products', query: { brand: 'asus' } }}>ASUS · TUF Gaming</Link></li>
              <li><Link href={{ pathname: '/products', query: { brand: 'tp-link' } }}>TP-Link</Link></li>
              <li><Link href="/brands">Canon · Epson</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c3')}</h4>
            <ul>
              <li><a href={`https://wa.me/${BRAND_WHATSAPP}`} target="_blank" rel="noopener noreferrer">{t('footer.c3a')}</a></li>
              <li><a href="tel:+213561616911">{t('footer.c3b')}</a></li>
              <li><Link href="/about">{t('footer.c3c')}</Link></li>
              <li><Link href="/about">{t('footer.c3d')}</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h4>{t('footer.c4')}</h4>
            <ul>
              <li>{t('footer.c4a')}</li>
              <li><a href="tel:+213560990506">0560 99 05 06</a></li>
              <li><a href="tel:+213561616911">0561 616 911</a></li>
              <li><a href="mailto:contact@dtech.dz">contact@dtech.dz</a></li>
            </ul>
          </div>
        </div>
        <div className="ft-bottom">
          <span>© 2026 DTECH Algérie · {t('b.tag')}</span>
          <span className="lks">
            <Link href="/legal#mentions">{t('footer.legal')}</Link>
            <Link href="/legal#cgv">{t('footer.cgv')}</Link>
            <Link href="/legal#privacy">{t('footer.privacy')}</Link>
          </span>
          <span>{t('footer.madein')}</span>
        </div>
      </div>
    </footer>
  )
}
