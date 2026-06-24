'use client'

/**
 * Brand chrome — Header + Footer, ported from dtech-sections.jsx.
 * Language switch is wired to next-intl routing (route-based locale), and the
 * light/dark toggle uses the Brand theme context. Markup/classes match the
 * scoped brand-design.css.
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname, Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
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
          <LangSwitch />
          <ThemeToggle />
          <button className="icn" aria-label={t('aria.cart')}>
            <CartIcon />
            <span className="dot" />
          </button>
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
