'use client'

/**
 * HomeShowcase — D-Tech Algérie "Nightline" design
 *
 * Ported from the standalone reference in C:\Users\abdel\Downloads\Dtech
 * (D-Tech - Nightline.html + nightline-app.jsx + nightline-sections.jsx +
 * nightline-styles.css + showcase-data.jsx).
 *
 * Sections: Nav · Hero (3D glass-card stack) · Categories · Brands ·
 * Catalog (filter + pagination) · About + timeline · Contact + map ·
 * Footer. All CSS lives in ./home-showcase.css under the
 * `.home-showcase-root` scope so it doesn't bleed into the v2 admin.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { locales, type Locale } from '@/i18n/config'
import './home-showcase.css'

import {
  BRANDS,
  CATEGORIES,
  COUNT_BY_CAT,
  PRODUCTS,
  type DeviceKind,
  type IconKind,
  type ProductDef,
} from './nightline-data'

type Theme = 'dark' | 'light'

export function HomeShowcase() {
  const [activeCat, setActiveCat] = useState<IconKind | 'all'>('all')
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    document.body.dataset.homeChrome = 'showcase'
    if (window.localStorage.getItem('nl-theme') === 'light') setTheme('light')
    return () => {
      delete document.body.dataset.homeChrome
      delete document.body.dataset.homeTheme
    }
  }, [])

  useEffect(() => {
    document.body.dataset.homeTheme = theme
    window.localStorage.setItem('nl-theme', theme)
  }, [theme])

  return (
    <div className="home-showcase-root">
      <div className="bg-ambient" />
      <div className="bg-grid" />
      <div className="bg-orb a" />
      <div className="bg-orb b" />
      <div className="bg-orb c" />

      <Nav
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      {/* Not a <main>: the locale layout already renders <main id="main-content">. */}
      <div role="presentation">
        <Hero />
        <CategoriesSection onSelect={setActiveCat} />
        <BrandsSection />
        <CatalogSection activeCat={activeCat} setActiveCat={setActiveCat} />
        <AboutSection />
        <ContactSection />
      </div>
      <Footer />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Hooks + helpers
 * ──────────────────────────────────────────────────────────────── */

function useFade<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Safety: if the element is already in (or near) the viewport on mount,
    // reveal it right away. Avoids the section staying invisible when the
    // IntersectionObserver's threshold isn't met (e.g. on initial paint).
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('in')
            io.unobserve(el)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    // Last-resort fallback — if we never trigger after 4s, just reveal.
    const fallback = window.setTimeout(() => el.classList.add('in'), 4000)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])
  return ref
}

function Counter({
  to,
  suffix = '',
  prefix = '',
}: {
  to: number
  suffix?: string
  prefix?: string
}) {
  const locale = useLocale()
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const dur = 1600
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur)
              const eased = 1 - Math.pow(1 - p, 3)
              setV(Math.round(to * eased))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return (
    <span ref={ref}>
      {prefix}
      {v.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}
      {suffix}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Logo + Nav
 * ──────────────────────────────────────────────────────────────── */

function Logo() {
  const t = useTranslations('showcase.logo')
  return (
    <a href="#top" className="wordmark">
      <span className="logo">D</span>
      <span className="name">
        D-Tech<span className="dot">.</span>
        <small>{t('tagline')}</small>
      </span>
    </a>
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
          className={`seg ${l === locale ? 'on' : ''}`}
          onClick={() => {
            if (l !== locale) router.replace(pathname, { locale: l })
          }}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l.toUpperCase()}
        </button>
      ))}
      {/* Arabic appears in the design; the locale isn't wired up yet. */}
      <button
        type="button"
        className="seg dis"
        aria-disabled="true"
        title={t('arSoon')}
      >
        AR
      </button>
    </span>
  )
}

function Nav({
  theme,
  onToggleTheme,
}: {
  theme: Theme
  onToggleTheme: () => void
}) {
  const t = useTranslations('showcase.nav')
  return (
    <header>
      <div className="wrap hdr">
        <Logo />
        <nav className="primary">
          <a href="#categories" className="on">{t('catalogue')}</a>
          <a href="#brands">{t('brands')}</a>
          <a href="#products">{t('products')}</a>
        </nav>
        <div className="hdr-right">
          <NavLocaleSwitcher />
          <button
            className="icn"
            aria-label={t('themeAria')}
            aria-pressed={theme === 'light'}
            type="button"
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
          <button className="icn" aria-label={t('searchAria')} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <button className="icn" aria-label={t('accountAria')} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </button>
          <button className="icn" aria-label={t('cartAria')} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
            </svg>
            <span className="dot" />
          </button>
          <a className="btn btn-primary" href="#products">
            <span className="shimmer" />
            {t('explore')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Hero — 3D floating glass-card stack
 * ──────────────────────────────────────────────────────────────── */

function Hero() {
  const t = useTranslations('showcase.hero')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const stackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    const stack = stackRef.current
    if (!stage || !stack) return

    let raf = 0
    const target = { rx: 0, ry: 0 }
    const cur = { rx: 0, ry: 0 }
    const start = performance.now()

    const onMove = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height
      target.ry = nx * 16
      target.rx = -ny * 10
    }
    const onLeave = () => {
      target.rx = 0
      target.ry = 0
    }
    stage.addEventListener('mousemove', onMove)
    stage.addEventListener('mouseleave', onLeave)

    const tick = (t: number) => {
      const elapsed = (t - start) / 1000
      const autoRY = Math.sin(elapsed * 0.32) * 5
      const autoRX = Math.sin(elapsed * 0.24 + 1) * 2
      const autoRZ = Math.sin(elapsed * 0.18) * 1.5
      cur.rx += (target.rx - cur.rx) * 0.06
      cur.ry += (target.ry - cur.ry) * 0.06
      const rx = autoRX + cur.rx - 6
      const ry = autoRY + cur.ry - 18
      stack.style.setProperty('--rx', `${rx}deg`)
      stack.style.setProperty('--ry', `${ry}deg`)
      stack.style.setProperty('--rz', `${autoRZ}deg`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('mousemove', onMove)
      stage.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const particles = [
    { l: 8, t: 90, d: 9, dl: 0 },
    { l: 88, t: 80, d: 11, dl: -2 },
    { l: 22, t: 95, d: 7, dl: -4 },
    { l: 72, t: 88, d: 10, dl: -1.5 },
    { l: 14, t: 70, d: 12, dl: -6 },
    { l: 92, t: 60, d: 8, dl: -3 },
    { l: 50, t: 95, d: 11, dl: -5 },
    { l: 38, t: 88, d: 9, dl: -2.5 },
    { l: 64, t: 84, d: 13, dl: -7 },
    { l: 6, t: 50, d: 10, dl: -4.5 },
    { l: 96, t: 40, d: 12, dl: -2 },
    { l: 78, t: 96, d: 8, dl: -3.5 },
  ]

  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <span className="kicker" style={{ marginBottom: 24 }}>
            {t('kicker')}
          </span>
          <h1 className="h-mega">
            {t('title1')}
            <br />
            <span className="serif-i" style={{ color: 'var(--cyan)' }}>
              {t('title2')}
            </span>
          </h1>
          <p className="sub">
            {t.rich('sub', {
              count: PRODUCTS.length,
              strong: (chunks: ReactNode) => (
                <strong style={{ color: 'var(--text)' }}>{chunks}</strong>
              ),
            })}
          </p>
          <div className="cta">
            <a className="btn btn-primary btn-lg" href="#products">
              <span className="shimmer" />
              {t('ctaCatalog')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a className="btn btn-ghost btn-lg" href="#about">
              {t('ctaStory')}
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <div className="v">
                <Counter to={20} suffix="+" />
                <span className="accent"> {t('stats.yearsSuffix')}</span>
              </div>
              <div className="l">{t('stats.presence')}</div>
            </div>
            <div>
              <div className="v">
                <Counter to={BRANDS.length} />
                <span className="accent"> {t('stats.brandsSuffix')}</span>
              </div>
              <div className="l">{t('stats.partners')}</div>
            </div>
            <div>
              <div className="v">
                <Counter to={58} />
                <span className="accent"> {t('stats.wilayasSuffix')}</span>
              </div>
              <div className="l">{t('stats.wilayas')}</div>
            </div>
          </div>
        </div>

        <div className="hero-stage" ref={stageRef}>
          <div className="halo-mint" />
          <div className="halo-steel" />

          <div className="ring r3" />
          <div className="ring r1" />
          <div className="ring r2" />

          <div className="stack-glow" />
          <div className="stack-glow steel" />

          <div className="dust">
            {particles.map((p, i) => (
              <span
                key={i}
                style={{
                  left: `${p.l}%`,
                  top: `${p.t}%`,
                  animationDuration: `${p.d}s`,
                  animationDelay: `${p.dl}s`,
                }}
              />
            ))}
          </div>

          <svg className="conn-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="6" y1="10" x2="48" y2="50" />
            <line x1="98" y1="52" x2="56" y2="50" />
            <line x1="36" y1="96" x2="48" y2="56" />
            <circle cx="48" cy="50" r="0.6" />
          </svg>

          <div className="hero-stack" ref={stackRef}>
            {/* Card 1 — customer satisfaction */}
            <div className="glass-card gc-1">
              <div className="gc-head">
                <span>{t('cards.satisfaction.head')}</span>
                <span>
                  <span className="led" /> {t('cards.satisfaction.verified')}
                </span>
              </div>
              <div className="gc-body" style={{ gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: 34,
                      color: 'var(--text)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    4,9
                    <span style={{ fontSize: 16, color: 'var(--mute)', fontWeight: 500 }}>
                      {' '}
                      {t('cards.satisfaction.outOf')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <svg
                        key={i}
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="var(--cyan)"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(124,224,195,0.5))' }}
                      >
                        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="gc-sub">{t('cards.satisfaction.reviews')}</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    marginTop: 8,
                  }}
                >
                  {[
                    { l: t('cards.satisfaction.advice'), v: 96 },
                    { l: t('cards.satisfaction.delivery'), v: 94 },
                    { l: t('cards.satisfaction.support'), v: 98 },
                  ].map((r) => (
                    <div
                      key={r.l}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span style={{ width: 50, color: 'var(--mute)', textTransform: 'uppercase' }}>
                        {r.l}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          height: 3,
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 2,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${r.v}%`,
                            background:
                              'linear-gradient(90deg, var(--blue-2), var(--cyan))',
                            boxShadow: '0 0 6px rgba(124,224,195,0.6)',
                            borderRadius: 2,
                          }}
                        />
                      </span>
                      <span style={{ width: 24, color: 'var(--text)', textAlign: 'right' }}>
                        {r.v}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 — Algeria coverage */}
            <div className="glass-card gc-2">
              <div className="gc-head">
                <span>{t('cards.coverage.head')}</span>
                <span>
                  <span className="led" /> {t('cards.coverage.led')}
                </span>
              </div>
              <div className="gc-body">
                <div className="gc-title" style={{ fontSize: 17 }}>
                  {t('cards.coverage.title')}
                </div>
                <div className="gc-sub">{t('cards.coverage.sub')}</div>
              </div>
              <div style={{ position: 'relative', marginTop: 10, height: 110, zIndex: 2 }}>
                <svg viewBox="0 0 220 110" style={{ width: '100%', height: '100%' }}>
                  <path
                    d="M 30 18 L 78 12 L 130 16 L 170 14 L 198 22 L 204 38 L 192 58 L 200 78 L 178 96 L 140 100 L 92 96 L 52 92 L 30 76 L 24 52 Z"
                    fill="rgba(255,255,255,0.04)"
                    stroke="rgba(124,224,195,0.3)"
                    strokeWidth="0.8"
                  />
                  {[
                    [62, 30], [88, 26], [120, 28], [148, 30], [176, 36],
                    [50, 48], [78, 50], [104, 52], [136, 54], [168, 56], [188, 60],
                    [60, 72], [92, 76], [124, 78], [156, 80],
                    [82, 90], [120, 92], [148, 92],
                  ].map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="rgba(124,224,195,0.85)"
                      style={{ filter: 'drop-shadow(0 0 3px rgba(124,224,195,0.7))' }}
                    />
                  ))}
                  <circle
                    cx="104"
                    cy="26"
                    r="3.5"
                    fill="var(--cyan)"
                    style={{ filter: 'drop-shadow(0 0 6px var(--cyan))' }}
                  />
                  <text
                    x="111"
                    y="22"
                    fill="var(--text)"
                    fontFamily="JetBrains Mono"
                    fontSize="6.5"
                    letterSpacing="1.5"
                  >
                    {t('cards.coverage.capital')}
                  </text>
                </svg>
              </div>
            </div>

            {/* Card 3 — warranty */}
            <div className="glass-card gc-3">
              <div className="gc-head">
                <span>{t('cards.warranty.head')}</span>
                <span>
                  <span className="led" /> {t('cards.warranty.certified')}
                </span>
              </div>
              <div className="gc-body" style={{ gap: 6 }}>
                <div className="gc-title" style={{ fontSize: 18 }}>
                  {t.rich('cards.warranty.title', {
                    accent: (chunks: ReactNode) => (
                      <span style={{ color: 'var(--cyan)' }}>{chunks}</span>
                    ),
                  })}
                </div>
                <div className="gc-sub">{t('cards.warranty.sub')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {[
                    t('cards.warranty.l1'),
                    t('cards.warranty.l2'),
                    t('cards.warranty.l3'),
                  ].map((line) => (
                    <div
                      key={line}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        fontSize: 12,
                        color: 'var(--text)',
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 50,
                          background: 'rgba(124,224,195,0.18)',
                          border: '1px solid rgba(124,224,195,0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--cyan)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 13l5 5L20 7" />
                        </svg>
                      </span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <span className="float-chip fc-1">
            <span className="dot" />
            {t('chips.brands', { count: BRANDS.length })}
          </span>
          <span className="float-chip fc-2">
            <span className="dot steel" />
            {t('chips.wilayas')}
          </span>
          <span className="float-chip fc-3">
            <span className="dot" />
            {t('chips.warranty')}
          </span>
        </div>
      </div>

      <div className="scroll-cue">
        <span>{t('scrollCue')}</span>
        <span className="line" />
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Category icons
 * ──────────────────────────────────────────────────────────────── */

function CatIcon({ kind, size = 26 }: { kind: IconKind; size?: number }) {
  const props: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (kind) {
    case 'desktop':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="13" rx="1" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )
    case 'laptop':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="12" rx="1" />
          <path d="M2 20h20" />
        </svg>
      )
    case 'aio':
      return (
        <svg {...props}>
          <rect x="2" y="4" width="20" height="14" rx="1" />
          <path d="M8 22h8M12 18v4M2 14h20" />
        </svg>
      )
    case 'tablet':
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M11 18h2" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...props}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 19h2" />
        </svg>
      )
    case 'print':
      return (
        <svg {...props}>
          <rect x="6" y="3" width="12" height="6" />
          <rect x="3" y="9" width="18" height="9" rx="1" />
          <rect x="6" y="14" width="12" height="6" />
          <circle cx="18" cy="12.5" r="0.6" fill="currentColor" />
        </svg>
      )
    case 'network':
      return (
        <svg {...props}>
          <circle cx="12" cy="18" r="2" />
          <path d="M6 12a8 8 0 0112 0M3 8a14 14 0 0118 0M9 15a5 5 0 016 0" />
        </svg>
      )
    case 'parts':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <rect x="8" y="8" width="8" height="8" />
          <path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2" />
        </svg>
      )
    case 'gaming':
      return (
        <svg {...props}>
          <path d="M6 11h4M8 9v4" />
          <circle cx="15" cy="11" r="1" />
          <circle cx="17.5" cy="13" r="0.8" />
          <rect x="2" y="6" width="20" height="12" rx="4" />
        </svg>
      )
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Categories section
 * ──────────────────────────────────────────────────────────────── */

function CategoriesSection({ onSelect }: { onSelect: (cat: IconKind) => void }) {
  const t = useTranslations('showcase.categories')
  const ref = useFade<HTMLDivElement>()
  return (
    <section id="categories" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <span className="kicker" style={{ marginBottom: 12 }}>
              {t('kicker', { count: CATEGORIES.length })}
            </span>
            <h2 className="h-big">
              {t('title1')}
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                {t('title2')}
              </span>
            </h2>
            <p className="sub">{t('sub')}</p>
          </div>
        </div>

        <div className="cat-grid">
          {CATEGORIES.map((c, i) => (
            <a
              key={c.id}
              href="#products"
              className="cat"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={(e) => {
                e.preventDefault()
                onSelect(c.id)
                document
                  .getElementById('products')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              <div className="ix">
                {String(i + 1).padStart(2, '0')} /{' '}
                {String(CATEGORIES.length).padStart(2, '0')}
              </div>
              <div className="ic">
                <CatIcon kind={c.icon} size={26} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div className="name">{t(`items.${c.id}`)}</div>
                <div className="count">
                  {t('countLabel', { count: COUNT_BY_CAT[c.id] || 0 })}
                </div>
              </div>
              <span className="arr">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Brands section
 * ──────────────────────────────────────────────────────────────── */

function BrandsSection() {
  const t = useTranslations('showcase.brands')
  const ref = useFade<HTMLDivElement>()
  return (
    <section id="brands" className="sec" style={{ paddingTop: 0 }}>
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <span className="kicker" style={{ marginBottom: 12 }}>
              {t('kicker')}
            </span>
            <h2 className="h-big">
              {t('title1', { count: BRANDS.length })}
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                {t('title2')}
              </span>
            </h2>
            <p className="sub">{t('sub')}</p>
          </div>
          <a className="btn btn-ghost btn-sm" href="#products">
            {t('cta')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="brand-grid">
          {BRANDS.map((b, i) => (
            <a
              key={b.id}
              className="brand"
              style={{ animationDelay: `${i * 50}ms` }}
              href="#products"
            >
              <div className="ix">{String(i + 1).padStart(2, '0')}</div>
              <div className="logo">{b.name}</div>
              <div className="cats">{t(`items.${b.id}`)}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Device illustrations for product cards
 * ──────────────────────────────────────────────────────────────── */

function DeviceArt({ kind }: { kind: DeviceKind }) {
  switch (kind) {
    case 'desktop':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="36" y="22" width="80" height="120" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="44" y="32" width="64" height="6" rx="1" fill="#7ce0c3" opacity="0.5" />
          <rect x="44" y="46" width="40" height="3" rx="1" fill="white" opacity="0.4" />
          <rect x="44" y="56" width="50" height="3" rx="1" fill="white" opacity="0.3" />
          <circle cx="106" cy="124" r="3" fill="#7ce0c3" />
          <rect x="44" y="100" width="64" height="20" rx="2" fill="#7ce0c3" opacity="0.15" />
          <rect x="124" y="32" width="60" height="100" rx="4" fill="#13151b" stroke="#3a708a" strokeOpacity="0.3" />
          <rect x="130" y="40" width="48" height="60" rx="2" fill="#0d0e12" />
          <text x="154" y="74" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="6" letterSpacing="1.5" textAnchor="middle">D-TECH</text>
          <path d="M120 138 H188 L182 152 H126 Z" fill="#262932" />
          <path d="M30 138 H120 L114 152 H36 Z" fill="#262932" />
          <ellipse cx="100" cy="170" rx="80" ry="4" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'desktop-mini':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="56" y="60" width="88" height="60" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <circle cx="68" cy="72" r="2" fill="#7ce0c3" />
          <text x="100" y="96" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="2" textAnchor="middle">MINI</text>
          <rect x="64" y="104" width="72" height="4" rx="2" fill="white" opacity="0.3" />
          <rect x="56" y="120" width="88" height="2" fill="#0d0e12" />
          <ellipse cx="100" cy="142" rx="60" ry="3" fill="rgba(124,224,195,0.18)" />
        </svg>
      )
    case 'laptop':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="22" y="46" width="156" height="100" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="30" y="54" width="140" height="84" rx="3" fill="#0d0e12" />
          <text x="100" y="92" fill="white" fontFamily="Inter" fontSize="13" fontWeight="700" textAnchor="middle">D-Tech</text>
          <text x="100" y="106" fill="rgba(184,239,220,0.7)" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="1.5" textAnchor="middle">LAPTOP</text>
          <rect x="62" y="116" width="76" height="14" rx="3" fill="rgba(124,224,195,0.18)" />
          <path d="M8 146 H192 L182 162 H18 Z" fill="#262932" />
          <rect x="88" y="146" width="24" height="3" rx="1.5" fill="#0d0e12" />
          <ellipse cx="100" cy="172" rx="84" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'aio':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="14" y="30" width="172" height="116" rx="8" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="22" y="38" width="156" height="100" rx="4" fill="#0d0e12" />
          <text x="100" y="78" fill="white" fontFamily="Inter" fontSize="14" fontWeight="700" textAnchor="middle">ThinkCentre</text>
          <text x="100" y="94" fill="rgba(184,239,220,0.7)" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="1.5" textAnchor="middle">ALL-IN-ONE</text>
          <rect x="48" y="106" width="104" height="20" rx="3" fill="rgba(124,224,195,0.15)" />
          <rect x="58" y="113" width="58" height="3" rx="1.5" fill="white" opacity="0.6" />
          <rect x="58" y="120" width="40" height="3" rx="1.5" fill="white" opacity="0.4" />
          <rect x="86" y="148" width="28" height="6" rx="3" fill="#262932" />
          <path d="M70 154 H130 L122 168 H78 Z" fill="#262932" />
          <ellipse cx="100" cy="180" rx="46" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'tablet':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="48" y="16" width="104" height="168" rx="12" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="56" y="24" width="88" height="152" rx="6" fill="#0d0e12" />
          <text x="100" y="58" fill="white" fontFamily="Inter" fontSize="14" fontWeight="700" textAnchor="middle">D-Tab</text>
          <text x="100" y="74" fill="rgba(184,239,220,0.7)" fontFamily="JetBrains Mono" fontSize="8" letterSpacing="1.5" textAnchor="middle">2K · OCTA</text>
          <rect x="64" y="88" width="72" height="36" rx="4" fill="rgba(124,224,195,0.18)" />
          <rect x="70" y="98" width="30" height="3" rx="1.5" fill="#7ce0c3" />
          <rect x="70" y="106" width="44" height="3" rx="1.5" fill="white" opacity="0.5" />
          <rect x="70" y="114" width="36" height="3" rx="1.5" fill="white" opacity="0.5" />
          <rect x="64" y="134" width="20" height="20" rx="3" fill="rgba(255,255,255,0.08)" />
          <rect x="88" y="134" width="20" height="20" rx="3" fill="#7ce0c3" opacity="0.6" />
          <rect x="112" y="134" width="24" height="20" rx="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="100" cy="194" rx="46" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'phone':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="68" y="12" width="64" height="172" rx="14" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="74" y="18" width="52" height="160" rx="9" fill="#0d0e12" />
          <rect x="92" y="20" width="16" height="3" rx="1.5" fill="#0d0e12" />
          <text x="100" y="42" fill="white" fontFamily="Inter" fontSize="11" fontWeight="700" textAnchor="middle">14:32</text>
          <rect x="80" y="56" width="40" height="22" rx="5" fill="#7ce0c3" opacity="0.85" />
          <rect x="80" y="84" width="18" height="20" rx="4" fill="rgba(255,255,255,0.08)" />
          <rect x="102" y="84" width="18" height="20" rx="4" fill="rgba(255,255,255,0.08)" />
          <rect x="80" y="110" width="40" height="20" rx="4" fill="rgba(124,224,195,0.18)" />
          <rect x="80" y="136" width="40" height="14" rx="3" fill="rgba(255,255,255,0.06)" />
          <ellipse cx="100" cy="192" rx="34" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'feature':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="78" y="10" width="44" height="180" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="84" y="16" width="32" height="38" rx="2" fill="#0d0e12" />
          <text x="100" y="32" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="5" letterSpacing="1.5" textAnchor="middle">D-TECH</text>
          <text x="100" y="46" fill="white" fontFamily="Inter" fontSize="9" fontWeight="700" textAnchor="middle">14:32</text>
          <circle cx="100" cy="68" r="5" fill="#181b22" />
          <circle cx="100" cy="68" r="2" fill="#7ce0c3" />
          <g fill="#181b22">
            <rect x="84" y="80" width="9" height="8" rx="1.5" />
            <rect x="95" y="80" width="9" height="8" rx="1.5" />
            <rect x="106" y="80" width="9" height="8" rx="1.5" />
            <rect x="84" y="92" width="9" height="8" rx="1.5" />
            <rect x="95" y="92" width="9" height="8" rx="1.5" />
            <rect x="106" y="92" width="9" height="8" rx="1.5" />
            <rect x="84" y="104" width="9" height="8" rx="1.5" />
            <rect x="95" y="104" width="9" height="8" rx="1.5" />
            <rect x="106" y="104" width="9" height="8" rx="1.5" />
            <rect x="84" y="116" width="9" height="8" rx="1.5" />
            <rect x="95" y="116" width="9" height="8" rx="1.5" />
            <rect x="106" y="116" width="9" height="8" rx="1.5" />
          </g>
          <ellipse cx="100" cy="196" rx="26" ry="2.5" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'printer-laser':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="36" y="56" width="128" height="86" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="44" y="62" width="112" height="22" rx="3" fill="#0d0e12" />
          <rect x="48" y="68" width="42" height="3" rx="1.5" fill="#7ce0c3" />
          <rect x="48" y="76" width="28" height="3" rx="1.5" fill="white" opacity="0.4" />
          <rect x="140" y="70" width="12" height="8" rx="2" fill="rgba(124,224,195,0.5)" />
          <rect x="56" y="92" width="88" height="36" rx="3" fill="#262932" />
          <line x1="56" y1="106" x2="144" y2="106" stroke="#0d0e12" strokeWidth="0.8" />
          <line x1="56" y1="118" x2="144" y2="118" stroke="#0d0e12" strokeWidth="0.8" />
          <rect x="48" y="38" width="104" height="22" rx="2" fill="rgba(184,239,220,0.06)" stroke="rgba(184,239,220,0.18)" />
          <ellipse cx="100" cy="158" rx="68" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'printer-ink':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="32" y="64" width="136" height="80" rx="8" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="42" y="72" width="116" height="20" rx="3" fill="#0d0e12" />
          <text x="100" y="86" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="2" textAnchor="middle">D-TECH</text>
          <rect x="50" y="100" width="100" height="32" rx="3" fill="#13151b" />
          <g fill="#7ce0c3">
            <rect x="54" y="106" width="12" height="20" rx="2" opacity="0.85" />
            <rect x="68" y="106" width="12" height="20" rx="2" opacity="0.6" fill="#FF6B9D" />
            <rect x="82" y="106" width="12" height="20" rx="2" opacity="0.7" fill="#FFD23F" />
            <rect x="96" y="106" width="12" height="20" rx="2" opacity="0.85" fill="white" />
          </g>
          <rect x="62" y="40" width="76" height="28" rx="2" fill="rgba(184,239,220,0.06)" stroke="rgba(184,239,220,0.18)" />
          <ellipse cx="100" cy="160" rx="72" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'copier':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="34" y="36" width="132" height="36" rx="4" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="42" y="44" width="116" height="20" rx="2" fill="#0d0e12" />
          <text x="100" y="58" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="2" textAnchor="middle">imageRUNNER</text>
          <rect x="40" y="76" width="120" height="60" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="48" y="84" width="50" height="20" rx="3" fill="#0d0e12" />
          <rect x="54" y="92" width="36" height="3" rx="1.5" fill="white" opacity="0.4" />
          <rect x="54" y="100" width="24" height="3" rx="1.5" fill="white" opacity="0.4" />
          <rect x="108" y="84" width="44" height="20" rx="3" fill="#7ce0c3" opacity="0.85" />
          <rect x="48" y="112" width="104" height="20" rx="3" fill="#262932" />
          <line x1="48" y1="122" x2="152" y2="122" stroke="#0d0e12" />
          <rect x="58" y="140" width="84" height="20" rx="2" fill="rgba(184,239,220,0.08)" />
          <ellipse cx="100" cy="174" rx="78" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'scanner':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="32" y="76" width="136" height="56" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="40" y="82" width="120" height="38" rx="3" fill="#0d0e12" />
          <line x1="48" y1="100" x2="152" y2="100" stroke="#7ce0c3" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
          <rect x="32" y="64" width="136" height="14" rx="2" fill="#262932" />
          <ellipse cx="100" cy="148" rx="76" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'router':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="40" y="92" width="120" height="36" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <line x1="56" y1="62" x2="60" y2="92" stroke="#262932" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="56" x2="80" y2="92" stroke="#262932" strokeWidth="3" strokeLinecap="round" />
          <line x1="120" y1="56" x2="120" y2="92" stroke="#262932" strokeWidth="3" strokeLinecap="round" />
          <line x1="144" y1="62" x2="140" y2="92" stroke="#262932" strokeWidth="3" strokeLinecap="round" />
          <g fill="#7ce0c3">
            <circle cx="60" cy="110" r="3" />
            <circle cx="80" cy="110" r="3" opacity="0.6" />
            <circle cx="100" cy="110" r="3" />
            <circle cx="120" cy="110" r="3" opacity="0.6" />
          </g>
          <text x="100" y="124" fill="white" fontFamily="Inter" fontSize="8" fontWeight="700" textAnchor="middle">TP-LINK</text>
          <ellipse cx="100" cy="142" rx="70" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'mesh':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <ellipse cx="60" cy="148" rx="22" ry="10" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <ellipse cx="60" cy="138" rx="22" ry="10" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.4" />
          <ellipse cx="100" cy="120" rx="26" ry="12" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.5" />
          <ellipse cx="100" cy="108" rx="26" ry="12" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.6" />
          <ellipse cx="140" cy="148" rx="22" ry="10" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <ellipse cx="140" cy="138" rx="22" ry="10" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.4" />
          <circle cx="60" cy="138" r="2.5" fill="#7ce0c3" />
          <circle cx="100" cy="108" r="2.5" fill="#7ce0c3" />
          <circle cx="140" cy="138" r="2.5" fill="#7ce0c3" />
          <path d="M68 130 Q80 116 100 110" stroke="#7ce0c3" strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.6" />
          <path d="M132 130 Q120 116 100 110" stroke="#7ce0c3" strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.6" />
          <text x="100" y="180" fill="rgba(184,239,220,0.7)" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="2" textAnchor="middle">DECO</text>
        </svg>
      )
    case 'switch':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="20" y="80" width="160" height="44" rx="4" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <g fill="#0d0e12" stroke="#262932">
            <rect x="32" y="92" width="14" height="14" rx="1.5" />
            <rect x="50" y="92" width="14" height="14" rx="1.5" />
            <rect x="68" y="92" width="14" height="14" rx="1.5" />
            <rect x="86" y="92" width="14" height="14" rx="1.5" />
            <rect x="106" y="92" width="14" height="14" rx="1.5" />
            <rect x="124" y="92" width="14" height="14" rx="1.5" />
            <rect x="142" y="92" width="14" height="14" rx="1.5" />
            <rect x="160" y="92" width="12" height="14" rx="1.5" />
          </g>
          <g fill="#7ce0c3">
            <circle cx="32" cy="116" r="1.5" />
            <circle cx="50" cy="116" r="1.5" opacity="0.5" />
            <circle cx="68" cy="116" r="1.5" />
            <circle cx="86" cy="116" r="1.5" opacity="0.5" />
          </g>
          <ellipse cx="100" cy="138" rx="78" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'ap':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="110" r="50" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <circle cx="100" cy="110" r="36" fill="#13151b" />
          <circle cx="100" cy="110" r="4" fill="#7ce0c3" />
          <g stroke="#7ce0c3" strokeOpacity="0.4" fill="none">
            <circle cx="100" cy="110" r="14" />
            <circle cx="100" cy="110" r="24" />
          </g>
          <text x="100" y="170" fill="rgba(184,239,220,0.7)" fontFamily="JetBrains Mono" fontSize="8" letterSpacing="2" textAnchor="middle">ACCESS POINT</text>
        </svg>
      )
    case 'wifi-usb':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="60" y="86" width="84" height="32" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="30" y="96" width="32" height="12" rx="2" fill="#262932" />
          <rect x="32" y="98" width="28" height="8" rx="1" fill="#0d0e12" />
          <rect x="138" y="78" width="14" height="48" rx="2" fill="#262932" />
          <g stroke="#7ce0c3" strokeOpacity="0.5" fill="none">
            <path d="M150 70 Q166 80 152 100" />
            <path d="M154 64 Q172 78 158 102" />
          </g>
          <ellipse cx="100" cy="134" rx="60" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'wifi-pci':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="30" y="80" width="120" height="60" rx="3" fill="#13151b" stroke="#262932" />
          <g fill="#7ce0c3">
            <rect x="38" y="92" width="10" height="14" rx="1" />
            <rect x="52" y="92" width="10" height="14" rx="1" opacity="0.7" />
            <rect x="38" y="112" width="24" height="6" />
            <rect x="80" y="92" width="24" height="20" rx="2" />
          </g>
          <rect x="118" y="92" width="28" height="22" rx="2" fill="#262932" />
          <line x1="30" y1="140" x2="150" y2="140" stroke="#7ce0c3" strokeWidth="2" />
          <g stroke="#262932" strokeWidth="2" strokeLinecap="round">
            <line x1="160" y1="78" x2="170" y2="60" />
            <line x1="172" y1="86" x2="184" y2="74" />
          </g>
          <circle cx="170" cy="60" r="3" fill="#7ce0c3" />
          <circle cx="184" cy="74" r="3" fill="#7ce0c3" opacity="0.7" />
        </svg>
      )
    case 'psu':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="40" y="60" width="120" height="80" rx="4" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <circle cx="100" cy="100" r="26" fill="#0d0e12" stroke="#262932" />
          <g stroke="#7ce0c3" strokeWidth="2" strokeLinecap="round">
            <line x1="100" y1="78" x2="100" y2="100" />
            <line x1="100" y1="100" x2="118" y2="92" />
            <line x1="100" y1="100" x2="82" y2="108" />
            <line x1="100" y1="100" x2="114" y2="118" />
          </g>
          <circle cx="100" cy="100" r="3" fill="#7ce0c3" />
          <text x="56" y="76" fill="#7ce0c3" fontFamily="JetBrains Mono" fontSize="6" letterSpacing="2">TUF GAMING</text>
          <ellipse cx="100" cy="156" rx="64" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'case':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <rect x="60" y="32" width="80" height="140" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <rect x="68" y="40" width="64" height="100" rx="3" fill="#0d0e12" />
          <g fill="#7ce0c3">
            <rect x="76" y="50" width="48" height="6" rx="1" opacity="0.6" />
            <rect x="76" y="62" width="48" height="6" rx="1" opacity="0.5" fill="#3a708a" />
            <rect x="76" y="74" width="48" height="6" rx="1" opacity="0.4" fill="#FF6B9D" />
            <rect x="76" y="88" width="30" height="20" rx="2" opacity="0.85" />
          </g>
          <circle cx="124" cy="98" r="6" fill="rgba(124,224,195,0.4)" />
          <g fill="#262932">
            <rect x="68" y="146" width="64" height="6" rx="1" />
            <rect x="68" y="156" width="64" height="6" rx="1" />
          </g>
          <ellipse cx="100" cy="184" rx="44" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'headset':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <path d="M50 110 Q50 60 100 60 Q150 60 150 110" stroke="#262932" strokeWidth="4" fill="none" />
          <path d="M50 110 Q50 60 100 60 Q150 60 150 110" stroke="#7ce0c3" strokeWidth="1.5" fill="none" strokeDasharray="2 3" opacity="0.5" />
          <rect x="36" y="104" width="22" height="44" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.4" />
          <rect x="142" y="104" width="22" height="44" rx="6" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.4" />
          <circle cx="47" cy="126" r="6" fill="#7ce0c3" opacity="0.7" />
          <circle cx="153" cy="126" r="6" fill="#7ce0c3" opacity="0.7" />
          <path d="M58 130 Q70 156 92 158" stroke="#262932" strokeWidth="2.5" fill="none" />
          <ellipse cx="100" cy="180" rx="60" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
    case 'mouse':
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <path d="M 100 50 C 130 50, 144 84, 144 118 C 144 152, 124 168, 100 168 C 76 168, 56 152, 56 118 C 56 84, 70 50, 100 50 Z" fill="#181b22" stroke="#7ce0c3" strokeOpacity="0.3" />
          <line x1="100" y1="52" x2="100" y2="108" stroke="#262932" />
          <rect x="96" y="84" width="8" height="16" rx="3" fill="#7ce0c3" opacity="0.85" />
          <g fill="#7ce0c3">
            <circle cx="100" cy="120" r="2" />
            <circle cx="100" cy="130" r="1.5" opacity="0.6" />
          </g>
          <ellipse cx="100" cy="180" rx="40" ry="3" fill="rgba(124,224,195,0.2)" />
        </svg>
      )
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Catalog (filterable + paginated)
 * ──────────────────────────────────────────────────────────────── */

const PER_PAGE = 8

function CatalogSection({
  activeCat,
  setActiveCat,
}: {
  activeCat: IconKind | 'all'
  setActiveCat: (c: IconKind | 'all') => void
}) {
  const t = useTranslations('showcase.catalog')
  const tCat = useTranslations('showcase.categories')
  const ref = useFade<HTMLDivElement>()
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () =>
      activeCat === 'all'
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.cat === activeCat),
    [activeCat]
  )

  useEffect(() => {
    setPage(1)
  }, [activeCat])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    setTimeout(() => {
      const el = document.getElementById('products')
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 50)
  }

  const pageNums: (number | '…')[] = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
    if (page >= totalPages - 3)
      return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }, [page, totalPages])

  return (
    <section id="products" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <span className="kicker" style={{ marginBottom: 12 }}>
              {t('kicker', {
                products: PRODUCTS.length,
                categories: CATEGORIES.length,
                brands: BRANDS.length,
              })}
            </span>
            <h2 className="h-big">
              {t('title1')}
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                {t('title2')}
              </span>
            </h2>
            <p className="sub">{t('sub')}</p>
          </div>
          <span className="kicker mono" style={{ color: 'var(--mute)' }}>
            {t('results', { count: filtered.length })}
          </span>
        </div>

        <div className="cat-filters" style={{ marginBottom: 28 }}>
          <button
            type="button"
            className={`cat-chip ${activeCat === 'all' ? 'on' : ''}`}
            onClick={() => setActiveCat('all')}
          >
            {t('all')}
            <span className="ct">{PRODUCTS.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`cat-chip ${activeCat === c.id ? 'on' : ''}`}
              onClick={() => setActiveCat(c.id)}
            >
              <CatIcon kind={c.icon} size={14} />
              {tCat(`items.${c.id}`)}
              <span className="ct">{COUNT_BY_CAT[c.id] || 0}</span>
            </button>
          ))}
        </div>

        <div className="page-meta">
          <span>
            {t.rich('showing', {
              from: (page - 1) * PER_PAGE + 1,
              to: Math.min(page * PER_PAGE, filtered.length),
              total: filtered.length,
              b: (chunks: ReactNode) => (
                <b style={{ color: 'var(--text)' }}>{chunks}</b>
              ),
            })}
          </span>
          <span>
            {t.rich('page', {
              page,
              total: totalPages,
              b: (chunks: ReactNode) => (
                <b style={{ color: 'var(--cyan)' }}>{chunks}</b>
              ),
            })}
          </span>
        </div>

        <div className="prod-grid" style={{ marginTop: 18 }}>
          {pageItems.map((p, i) => (
            <ProductCard key={p.id} product={p} animationDelay={(i % 8) * 40} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="page-btn nav"
              disabled={page === 1}
              onClick={() => goPage(page - 1)}
              aria-label={t('prevAria')}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              {t('prev')}
            </button>
            {pageNums.map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} className="page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={n}
                  className={`page-btn ${page === n ? 'on' : ''}`}
                  onClick={() => goPage(n)}
                  aria-label={t('pageAria', { n })}
                  aria-current={page === n ? 'page' : undefined}
                >
                  {n}
                </button>
              )
            )}
            <button
              type="button"
              className="page-btn nav"
              disabled={page === totalPages}
              onClick={() => goPage(page + 1)}
              aria-label={t('nextAria')}
            >
              {t('next')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ProductCard({
  product,
  animationDelay,
}: {
  product: ProductDef
  animationDelay: number
}) {
  const t = useTranslations('showcase.catalog')
  const tCat = useTranslations('showcase.categories')
  return (
    <article className="prod" style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="canvas">
        <span className="brand-tag">{product.brand}</span>
        {product.badge && <span className="badge">{product.badge}</span>}
        <DeviceArt kind={product.img} />
        <button type="button" className="add" aria-label={t('addAria')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
      <div className="info">
        <span className="cat-lbl">{tCat(`items.${product.cat}`)}</span>
        <span className="name">{product.name}</span>
        <span className="specs">{product.spec}</span>
        <div className="price-row">
          <span className="price">
            {product.price}
            <span className="da"> {t('currency')}</span>
          </span>
          <span className="stock">{t('inStock')}</span>
        </div>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * About + timeline
 * ──────────────────────────────────────────────────────────────── */

function AboutSection() {
  const t = useTranslations('showcase.about')
  const ref = useFade<HTMLDivElement>()
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>
  return (
    <section id="about" className="sec">
      <div ref={ref} className="wrap fade about-grid">
        <div className="about-text">
          <span className="kicker" style={{ marginBottom: 14 }}>
            {t('kicker')}
          </span>
          <h2 className="h-big">
            {t('title1')}
            <br />
            <span className="serif-i" style={{ color: 'var(--cyan)' }}>
              {t('title2')}
            </span>{' '}
            {t('title3')}
          </h2>
          <p>{t.rich('p1', { strong })}</p>
          <p>{t.rich('p2', { strong })}</p>

          <div className="about-stats">
            <div className="about-stat">
              <div className="v">
                <span className="accent">
                  <Counter to={2006} />
                </span>
              </div>
              <div className="l">{t('stats.founded')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <Counter to={30000} />
                <span className="accent">+</span>
              </div>
              <div className="l">{t('stats.clients')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <Counter to={BRANDS.length} />
                <span className="accent"> {t('stats.brandsSuffix')}</span>
              </div>
              <div className="l">{t('stats.partners')}</div>
            </div>
            <div className="about-stat">
              <div className="v">
                <Counter to={PRODUCTS.length} />
                <span className="accent"> {t('stats.skuSuffix')}</span>
              </div>
              <div className="l">{t('stats.sku')}</div>
            </div>
          </div>
        </div>

        <div className="about-visual">
          <div className="timeline">
            <TLItem year="2006" title={t('timeline.t1Title')} desc={t('timeline.t1Desc')} />
            <TLItem year="2012" title={t('timeline.t2Title')} desc={t('timeline.t2Desc')} />
            <TLItem year="2017" title={t('timeline.t3Title')} desc={t('timeline.t3Desc')} />
            <TLItem year="2022" title={t('timeline.t4Title')} desc={t('timeline.t4Desc')} />
            <TLItem
              year="2026"
              title={t('timeline.t5Title', { count: PRODUCTS.length })}
              desc={t('timeline.t5Desc')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function TLItem({ year, title, desc }: { year: string; title: string; desc: string }) {
  return (
    <div className="tl-item">
      <div className="yr">{year}</div>
      <div className="ttl">{title}</div>
      <div className="d">{desc}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Contact + map
 * ──────────────────────────────────────────────────────────────── */

type ContactTab = 'show' | 'comm' | 'sav'

interface TabContent {
  phone: string
  email: string
  addr: string
  hours: string
}

// Locale-independent contact details. Display strings live in the
// `showcase.contact` translation namespace.
const TAB_EMAILS: Record<ContactTab, string> = {
  show: 'contact@dtech.dz',
  comm: 'commercial@dtech.dz',
  sav: 'sav@dtech.dz',
}

const TAB_TEL: Record<ContactTab, string> = {
  // Showroom has no direct line — route calls to the sales desk.
  show: '+213560990506',
  comm: '+213560990506',
  sav: '+213561616911',
}

const DAYS: { id: number; key: string; open: string | null; close: string | null }[] = [
  { id: 1, key: 'mon', open: '09:00', close: '17:00' },
  { id: 2, key: 'tue', open: '09:00', close: '17:00' },
  { id: 3, key: 'wed', open: '09:00', close: '17:00' },
  { id: 4, key: 'thu', open: '09:00', close: '17:00' },
  { id: 5, key: 'fri', open: null, close: null },
  { id: 6, key: 'sat', open: null, close: null },
  { id: 0, key: 'sun', open: '09:00', close: '17:00' },
]

function isOpenAt(d: Date): boolean {
  const day = DAYS.find((x) => x.id === d.getDay())
  if (!day?.open || !day.close) return false
  const hm = d.getHours() * 60 + d.getMinutes()
  const [oh = 0, om = 0] = day.open.split(':').map(Number)
  const [ch = 0, cm = 0] = day.close.split(':').map(Number)
  return hm >= oh * 60 + om && hm < ch * 60 + cm
}

function ContactSection() {
  const t = useTranslations('showcase.contact')
  const ref = useFade<HTMLDivElement>()
  const [tab, setTab] = useState<ContactTab>('show')
  const [today, setToday] = useState<number>(-1)
  const [live, setLive] = useState<{ time: string; open: boolean } | null>(null)

  // initialize on the client only to avoid SSR/CSR mismatch
  useEffect(() => {
    const update = () => {
      const d = new Date()
      setToday(d.getDay())
      setLive({
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        open: isOpenAt(d),
      })
    }
    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const tabData: TabContent = {
    phone: t(`tabData.${tab}.phone`),
    email: TAB_EMAILS[tab],
    addr: t(`tabData.${tab}.addr`),
    hours: t(`tabData.${tab}.hours`),
  }

  return (
    <section id="contact" className="sec">
      <div ref={ref} className="wrap fade">
        <div className="sec-head">
          <div>
            <span className="kicker" style={{ marginBottom: 12 }}>
              {t('kicker')}
            </span>
            <h2 className="h-big">
              {t('title1')}
              <br />
              <span className="serif-i" style={{ color: 'var(--cyan)' }}>
                {t('title2')}
              </span>
            </h2>
            <p className="sub">{t('sub')}</p>
          </div>
        </div>

        <div className="contact-v2">
          <MapPanel live={live} />
          <ContactPanel
            tab={tab}
            setTab={setTab}
            tabData={tabData}
            today={today}
            live={live}
          />
        </div>
      </div>
    </section>
  )
}

function MapPanel({ live }: { live: { time: string; open: boolean } | null }) {
  const t = useTranslations('showcase.contact')
  return (
    <div className="map-panel">
      <div className="map-info">
        <span className="live">
          <span className="d" />
          {live
            ? `${live.open ? t('map.open') : t('map.closedNow')} · ${live.time}`
            : t('map.open')}
        </span>
        <div className="name">{t('map.name')}</div>
        <div className="addr">
          {t('map.addr1')}
          <br />
          {t('map.addr2')}
        </div>
        <div className="coords">{t('map.coords')}</div>
      </div>

      <div className="map-compass" aria-hidden>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="20" stroke="rgba(184,239,220,0.25)" />
          <circle cx="22" cy="22" r="14" stroke="rgba(184,239,220,0.15)" />
          <text x="22" y="9" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#7ce0c3" fontWeight="600">N</text>
          <text x="22" y="40" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">S</text>
          <text x="6" y="25" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">W</text>
          <text x="38" y="25" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a8f99">E</text>
          <path d="M22 16 L18 26 L22 24 L26 26 Z" fill="#7ce0c3" />
          <path d="M22 16 L18 26 L22 24 L26 26 Z" fill="none" stroke="rgba(124,224,195,0.5)" />
          <circle cx="22" cy="22" r="1.5" fill="#7ce0c3" />
        </svg>
      </div>

      <div className="map-scale">
        <span>{t('map.scale')}</span>
        <div className="bar">
          <span className="s1" />
          <span className="s2" />
          <span className="s3" />
          <span className="s4" />
        </div>
        <div className="ticks">
          <span>0</span>
          <span>200m</span>
          <span>400m</span>
        </div>
      </div>

      <div className="map-legend">
        <div className="row head">{t('map.legend')}</div>
        <div className="row main">
          <span className="sw" />
          {t('map.legendMain')}
        </div>
        <div className="row poi">
          <span className="sw" />
          {t('map.legendPoi')}
        </div>
      </div>

      <svg
        viewBox="0 0 800 640"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden
      >
        <defs>
          <linearGradient id="m2-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06070a" />
            <stop offset="100%" stopColor="#0a0b0f" />
          </linearGradient>
          <linearGradient id="m2-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#13151b" />
            <stop offset="100%" stopColor="#0f1116" />
          </linearGradient>
          <radialGradient id="m2-aura" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(124,224,195,0.28)" />
            <stop offset="60%" stopColor="rgba(124,224,195,0.06)" />
            <stop offset="100%" stopColor="rgba(124,224,195,0)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="800" height="640" fill="url(#m2-sea)" />
        <path
          d="M 0 168 C 90 162, 180 178, 270 168 C 360 158, 450 178, 540 172 C 620 167, 700 175, 800 170 L 800 640 L 0 640 Z"
          fill="url(#m2-land)"
        />
        <path
          d="M 0 168 C 90 162, 180 178, 270 168 C 360 158, 450 178, 540 172 C 620 167, 700 175, 800 170"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.8"
          fill="none"
        />
        <ellipse cx="500" cy="390" rx="170" ry="120" fill="url(#m2-aura)" />

        <g fill="rgba(124,224,195,0.05)" stroke="rgba(124,224,195,0.10)" strokeWidth="0.5">
          <path d="M 260 460 C 240 450, 230 480, 250 500 C 280 514, 320 504, 326 480 C 332 460, 296 446, 260 460 Z" />
          <path d="M 600 240 C 590 232, 578 254, 590 268 C 612 280, 638 270, 638 252 C 638 238, 616 232, 600 240 Z" />
        </g>

        <g fill="rgba(255,255,255,0.025)">
          <rect x="420" y="350" width="24" height="14" rx="1" />
          <rect x="448" y="350" width="18" height="14" rx="1" />
          <rect x="470" y="350" width="22" height="14" rx="1" />
          <rect x="420" y="368" width="20" height="12" rx="1" />
          <rect x="444" y="368" width="26" height="12" rx="1" />
          <rect x="474" y="368" width="18" height="12" rx="1" />
          <rect x="528" y="350" width="30" height="14" rx="1" />
          <rect x="528" y="368" width="22" height="12" rx="1" />
          <rect x="554" y="368" width="16" height="12" rx="1" />
          <rect x="528" y="410" width="20" height="14" rx="1" />
          <rect x="552" y="410" width="24" height="14" rx="1" />
          <rect x="528" y="428" width="32" height="12" rx="1" />
          <rect x="564" y="428" width="14" height="12" rx="1" />
          <rect x="620" y="380" width="22" height="14" rx="1" />
          <rect x="646" y="380" width="18" height="14" rx="1" />
          <rect x="620" y="398" width="14" height="12" rx="1" />
          <rect x="638" y="398" width="26" height="12" rx="1" />
          <rect x="320" y="340" width="20" height="14" rx="1" />
          <rect x="344" y="340" width="18" height="14" rx="1" />
          <rect x="320" y="358" width="24" height="12" rx="1" />
          <rect x="348" y="358" width="14" height="12" rx="1" />
          <rect x="380" y="500" width="22" height="14" rx="1" />
          <rect x="406" y="500" width="18" height="14" rx="1" />
          <rect x="380" y="518" width="14" height="12" rx="1" />
          <rect x="398" y="518" width="26" height="12" rx="1" />
        </g>

        <g fill="none" strokeLinecap="round">
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(0,0,0,0.7)" strokeWidth="6" />
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(255,255,255,0.16)" strokeWidth="3.2" />
          <path d="M 0 322 C 200 312, 400 342, 800 306" stroke="rgba(124,224,195,0.20)" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M 0 232 C 200 224, 400 244, 800 228" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
          <path d="M 0 232 C 200 224, 400 244, 800 228" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
          <path d="M 0 460 C 200 456, 400 472, 800 458" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
          <path d="M 0 460 C 200 456, 400 472, 800 458" stroke="rgba(255,255,255,0.09)" strokeWidth="2" />
          <path d="M 280 168 L 296 640" stroke="rgba(0,0,0,0.45)" strokeWidth="3" />
          <path d="M 280 168 L 296 640" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M 500 170 L 524 640" stroke="rgba(0,0,0,0.45)" strokeWidth="3" />
          <path d="M 500 170 L 524 640" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M 660 172 L 700 640" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" />
          <path d="M 660 172 L 700 640" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          <path d="M 380 322 L 600 322" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          <path d="M 380 388 L 600 388" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
          <path d="M 440 232 L 460 510" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
        </g>

        <g fontFamily="JetBrains Mono" fontSize="9" fill="rgba(255,255,255,0.32)" letterSpacing="3">
          <text x="400" y="80" textAnchor="middle">{t('map.sea')}</text>
        </g>
        <g fontFamily="JetBrains Mono" fontSize="8" fill="rgba(124,224,195,0.45)" letterSpacing="1.5">
          <text x="120" y="316" textAnchor="middle">A1</text>
        </g>
        <g fontFamily="JetBrains Mono" fontSize="9" fill="rgba(255,255,255,0.22)" letterSpacing="2">
          <text x="500" y="320" textAnchor="middle">{t('map.area')}</text>
        </g>
      </svg>

      <span className="poi-marker" style={{ left: '34%', top: '52%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiUsthb')}</span>
      </span>
      <span className="poi-marker" style={{ left: '74%', top: '50%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiMall')}</span>
      </span>
      <span className="poi-marker" style={{ left: '78%', top: '76%' } as CSSProperties}>
        <span className="dot" />
        <span className="name">{t('map.poiAirport')}</span>
      </span>

      <div className="pin-target" style={{ left: '62.5%', top: '61.5%' } as CSSProperties}>
        <span className="crosshair" />
        <span className="pulse" />
        <span className="pulse r2" />
        <span className="pulse r3" />
        <span className="core" />
        <span className="label">{t('map.pin')}</span>
      </div>
    </div>
  )
}

function ContactPanel({
  tab,
  setTab,
  tabData,
  today,
  live,
}: {
  tab: ContactTab
  setTab: (t: ContactTab) => void
  tabData: TabContent
  today: number
  live: { time: string; open: boolean } | null
}) {
  const t = useTranslations('showcase.contact')
  return (
    <div className="contact-panel">
      <div className="contact-hero">
        <div className="grain" />
        <span className="badge">
          {live && !live.open ? t('panel.closedNow') : t('panel.openNow')}
        </span>

        <div className="store-illus">
          <svg viewBox="0 0 400 220" fill="none">
            <defs>
              <linearGradient id="store-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A2A44" />
                <stop offset="100%" stopColor="#0d0e12" />
              </linearGradient>
            </defs>
            <rect x="50" y="40" width="300" height="20" fill="url(#store-grad)" stroke="rgba(124,224,195,0.3)" />
            <text x="200" y="56" textAnchor="middle" fontFamily="Inter" fontSize="14" fontWeight="700" fill="#7ce0c3" letterSpacing="2">D-TECH</text>
            <rect x="50" y="60" width="300" height="140" fill="url(#store-grad)" stroke="rgba(124,224,195,0.2)" />
            <rect x="74" y="76" width="116" height="100" fill="rgba(124,224,195,0.08)" stroke="rgba(124,224,195,0.4)" />
            <line x1="132" y1="76" x2="132" y2="176" stroke="rgba(124,224,195,0.3)" />
            <line x1="74" y1="126" x2="190" y2="126" stroke="rgba(124,224,195,0.2)" />
            <rect x="82" y="88" width="42" height="28" rx="2" fill="rgba(184,239,220,0.18)" />
            <rect x="140" y="88" width="42" height="28" rx="2" fill="rgba(184,239,220,0.10)" />
            <rect x="82" y="138" width="42" height="28" rx="2" fill="rgba(184,239,220,0.10)" />
            <rect x="140" y="138" width="42" height="28" rx="2" fill="rgba(184,239,220,0.18)" />
            <rect x="208" y="100" width="48" height="76" fill="rgba(124,224,195,0.06)" stroke="rgba(124,224,195,0.5)" />
            <circle cx="246" cy="138" r="1.5" fill="#7ce0c3" />
            <rect x="270" y="76" width="60" height="100" fill="rgba(124,224,195,0.06)" stroke="rgba(124,224,195,0.3)" />
            <line x1="300" y1="76" x2="300" y2="176" stroke="rgba(124,224,195,0.2)" />
            <line x1="270" y1="126" x2="330" y2="126" stroke="rgba(124,224,195,0.2)" />
            <rect x="282" y="86" width="36" height="14" rx="2" fill="rgba(124,224,195,0.2)" />
            <text x="300" y="96" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill="#7ce0c3" letterSpacing="1.5">2026</text>
            <line x1="30" y1="200" x2="370" y2="200" stroke="rgba(184,239,220,0.4)" strokeWidth="1.5" />
            <circle cx="100" cy="194" r="3" fill="rgba(184,239,220,0.55)" />
            <rect x="98" y="194" width="4" height="6" rx="1" fill="rgba(184,239,220,0.55)" />
            <circle cx="320" cy="194" r="3" fill="rgba(184,239,220,0.4)" />
            <rect x="318" y="194" width="4" height="6" rx="1" fill="rgba(184,239,220,0.4)" />
            <circle cx="80" cy="20" r="0.8" fill="rgba(184,239,220,0.6)" />
            <circle cx="180" cy="14" r="0.6" fill="rgba(184,239,220,0.5)" />
            <circle cx="290" cy="22" r="0.8" fill="rgba(184,239,220,0.55)" />
            <circle cx="340" cy="14" r="0.5" fill="rgba(184,239,220,0.45)" />
          </svg>
        </div>

        <div className="meta">
          <div className="name">{t('panel.storeName')}</div>
          <div className="since">{t('panel.since')}</div>
        </div>
      </div>

      <div className="contact-tabs">
        <button type="button" className={`contact-tab ${tab === 'show' ? 'on' : ''}`} onClick={() => setTab('show')}>
          {t('tabs.show')}
        </button>
        <button type="button" className={`contact-tab ${tab === 'comm' ? 'on' : ''}`} onClick={() => setTab('comm')}>
          {t('tabs.comm')}
        </button>
        <button type="button" className={`contact-tab ${tab === 'sav' ? 'on' : ''}`} onClick={() => setTab('sav')}>
          {t('tabs.sav')}
        </button>
      </div>

      <div className="contact-body">
        <div className="contact-row">
          <span className="l">{t('rows.phone')}</span>
          <span className="v">{tabData.phone}</span>
        </div>
        <div className="contact-row">
          <span className="l">{t('rows.email')}</span>
          <span className="v">{tabData.email}</span>
        </div>
        <div className="contact-row">
          <span className="l">{t('rows.service')}</span>
          <span className="v">
            {tabData.addr}
            <small>{tabData.hours}</small>
          </span>
        </div>

        <div className="contact-actions">
          <a className="contact-action" href={`tel:${TAB_TEL[tab]}`}>
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            {t('actions.call')}
          </a>
          <a
            className="contact-action"
            href="https://maps.google.com/?q=Bab+Ezzouar+Alger"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-8-8 18-2-8-8-2z" />
              </svg>
            </span>
            {t('actions.route')}
          </a>
          <a
            className="contact-action"
            href="https://wa.me/213560990506"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.05 4.95a10 10 0 00-14.1 14.14L4 22l3.04-.95a10 10 0 0014.1-14.1zM12 20.5a8.5 8.5 0 01-4.34-1.18l-.31-.18-2.45.76.78-2.39-.2-.32A8.5 8.5 0 1112 20.5zm4.84-6.36c-.27-.13-1.57-.78-1.81-.87-.24-.09-.42-.13-.6.13s-.69.87-.84 1.05c-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.59-1.49-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46l-.51-.01c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.76.13.18 1.88 2.88 4.57 4.04.64.28 1.14.44 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.27.22-.62.22-1.15.16-1.26-.06-.12-.24-.18-.51-.31z" />
              </svg>
            </span>
            {t('actions.whatsapp')}
          </a>
        </div>

        <div className="hours">
          <h5>{t('hoursTitle')}</h5>
          {DAYS.map((d) => (
            <div
              key={d.id}
              className={`hours-row ${d.id === today ? 'today' : ''} ${d.open ? '' : 'closed'}`}
            >
              <span className="d">
                {t(`days.${d.key}`)}
                {d.id === today ? ` · ${t('today')}` : ''}
              </span>
              <span>{d.open ? `${d.open} – ${d.close}` : t('closed')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Footer
 * ──────────────────────────────────────────────────────────────── */

function Footer() {
  const t = useTranslations('showcase.footer')
  return (
    <footer>
      <div className="wrap">
        <div className="ft-grid">
          <div className="ft-brand">
            <Logo />
            <p>{t('blurb')}</p>
            <div className="ft-socials">
              <a className="icn" aria-label="Facebook">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.4v7A10 10 0 0022 12z" />
                </svg>
              </a>
              <a className="icn" aria-label="Instagram">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                </svg>
              </a>
              <a className="icn" aria-label="LinkedIn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.3 18.3H5.7V10h2.6v8.3zM7 8.7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11.3 9.6h-2.6V14c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1V18.3h-2.6V10h2.5v1c.4-.6 1.2-1.3 2.5-1.3 1.8 0 2.9 1.2 2.9 3.6v5z" />
                </svg>
              </a>
            </div>
          </div>
          <FootCol
            title={t('cols.catalog.title')}
            links={[
              t('cols.catalog.l1'),
              t('cols.catalog.l2'),
              t('cols.catalog.l3'),
              t('cols.catalog.l4'),
              t('cols.catalog.l5'),
            ]}
          />
          <FootCol
            title={t('cols.brands.title')}
            links={[
              t('cols.brands.l1'),
              t('cols.brands.l2'),
              t('cols.brands.l3'),
              t('cols.brands.l4'),
            ]}
          />
          <FootCol
            title={t('cols.service.title')}
            links={[
              t('cols.service.l1'),
              t('cols.service.l2'),
              t('cols.service.l3'),
              t('cols.service.l4'),
            ]}
          />
          <FootCol
            title={t('cols.contact.title')}
            links={[
              t('cols.contact.l1'),
              t('cols.contact.l2'),
              t('cols.contact.l3'),
              t('cols.contact.l4'),
            ]}
          />
        </div>
        <div className="ft-bottom">
          <span>{t('copyright')}</span>
          <span style={{ display: 'inline-flex', gap: 20 }}>
            <a>{t('legal')}</a>
            <a>{t('terms')}</a>
            <a>{t('privacy')}</a>
          </span>
          <span>{t('made')}</span>
        </div>
      </div>
    </footer>
  )
}

function FootCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="ft-col">
      <h4>{title}</h4>
      <ul>
        {links.map((l) => (
          <li key={l}>
            <a>{l}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
