'use client'

/**
 * Brand storefront sections — ported from dtech-sections.jsx, wired to the
 * real catalogue (products / categories / brands) instead of the design's
 * demo data. Product visuals use real photos. Markup/classes match the
 * scoped brand-design.css. RTL + light/dark come from BrandProvider.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@/i18n/routing'
import { useBrand } from './brand-context'
import { fmtNum } from './brand-i18n'
import {
  Arrow,
  IcTruck,
  IcShield,
  IcRepair,
  IcChat,
  WhatsAppIcon,
  CartIcon2,
  PhoneIcon,
  RouteIcon,
  ChevronLeft,
  ChevronRight,
  PageArrowPrev,
  PageArrowNext,
  GridCatIcon,
} from './brand-icons'
import { BRAND_WHATSAPP, type BrandProduct, type BrandCategory, type BrandBrandItem } from './brand-types'

/* ---------- helpers ---------- */

function useFade() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('in')
            io.unobserve(el)
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Counter({ to }: { to: number }) {
  const { lang } = useBrand()
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const dur = 1400
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur)
              setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        }),
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{fmtNum(v, lang)}</span>
}

/* ---------- hero ---------- */

function HeroSlider({ images }: { images: string[] }) {
  const { t } = useBrand()
  const slides = images.length ? images : ['', '', '', '']
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 5000)
    return () => clearInterval(id)
  }, [paused, slides.length])
  const go = (n: number) => setI((n + slides.length) % slides.length)
  return (
    <div className="hero-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((src, idx) => (
        <div key={idx} className={`hs-slide ${idx === i ? 'on' : ''}`}>
          {src ? (
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                background: 'radial-gradient(120% 90% at 80% 15%, var(--teal) 0%, var(--teal-deep) 60%, var(--teal-ink) 100%)',
                color: '#fff',
                fontFamily: 'var(--disp)',
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: '-0.04em',
              }}
            >
              dtech<sup style={{ fontSize: '.5em' }}>®</sup>
            </div>
          )}
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button className="hs-arrow prev" onClick={() => go(i - 1)} aria-label={t('catalog.prev')}><ChevronLeft /></button>
          <button className="hs-arrow next" onClick={() => go(i + 1)} aria-label={t('catalog.next')}><ChevronRight /></button>
          <div className="hs-dots">
            {slides.map((_, idx) => (
              <button key={idx} className={idx === i ? 'on' : ''} onClick={() => go(idx)} aria-label={`${t('catalog.page')} ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function BrandHero({ heroImages, productCount }: { heroImages: string[]; productCount: number }) {
  const { t, lang } = useBrand()
  // subStrong is like "44 produits" — strip the placeholder number, keep the unit word.
  const unit = t('hero.subStrong').replace(/^[\d\s., ]+/, '').trim()
  return (
    <section className="hero" id="top">
      <div className="wrap hero-clean">
        <div className="hero-left">
          <span className="eyebrow">{t('d.k')}</span>
          <h1 className="display h-hero">
            {t('d.h1a')} <span className="hl">{t('d.h1hl')}</span> {t('d.h1b')}
          </h1>
          <p className="lead">
            {t('hero.sub1')}
            <strong>{fmtNum(productCount, lang)} {unit}</strong>
            {t('hero.sub2')}
          </p>
          <div className="hero-cta">
            <a className="btn btn-teal btn-lg" href="#products">{t('d.cta')}<Arrow /></a>
            <a className="btn btn-text" href="#about">{t('hero.ctaStory')}<Arrow s={13} /></a>
          </div>
          <div className="hero-meta">
            <span><b><Counter to={20} />+</b> {t('hero.stat1l')}</span>
            <span className="sep" />
            <span><b>7</b> {t('hero.stat2l')}</span>
            <span className="sep" />
            <span><b>58/58</b> {t('hero.stat3l')}</span>
          </div>
        </div>
        <div className="hero-right">
          <HeroSlider images={heroImages} />
        </div>
      </div>
    </section>
  )
}

/* ---------- product card ---------- */

export function ProductCard({ p }: { p: BrandProduct }) {
  const { t } = useBrand()
  const waText = encodeURIComponent(`${t('card.waMsg')} ${p.name}`)
  return (
    <article className="prod">
      <Link href={`/products/${p.slug}`} className="canvas" aria-label={p.name}>
        <span className="stock-tag">{t('catalog.stock')}</span>
        {p.img ? (
          <img src={p.img} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ color: 'var(--mute)' }}><GridCatIcon kind={p.cat} size={72} /></span>
        )}
      </Link>
      <div className="info">
        <span className="cl">{p.brand} · {p.catName}</span>
        <Link href={`/products/${p.slug}`} className="nm">{p.name}</Link>
        <span className="sp">{p.spec}</span>
        <div className="foot">
          <a className="wa-btn" href={`https://wa.me/${BRAND_WHATSAPP}?text=${waText}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />{t('card.order')}
          </a>
          <Link className="cart-btn" href={`/products/${p.slug}`} aria-label={t('card.cart')} title={t('card.cart')}>
            <CartIcon2 />
          </Link>
        </div>
      </div>
    </article>
  )
}

/* ---------- shop ---------- */

export function BrandShop({ products, categories }: { products: BrandProduct[]; categories: BrandCategory[] }) {
  const { t } = useBrand()
  const ref = useFade()
  const PER = 8
  const [activeCat, setActiveCat] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = useMemo(
    () => (activeCat === 'all' ? products : products.filter((p) => p.cat === activeCat)),
    [activeCat, products]
  )
  useEffect(() => setPage(1), [activeCat])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER))
  const items = filtered.slice((page - 1) * PER, page * PER)
  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    setTimeout(() => {
      const el = document.getElementById('products')
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
    }, 40)
  }
  const nums = useMemo<(number | string)[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }, [page, totalPages])

  return (
    <section id="products" className="sec">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('shop.k')}</span>
              <h2 className="h-sec">{t('shop.h')}</h2>
            </div>
            <span className="meta">{filtered.length} {t('catalog.resultsWord')}</span>
          </div>

          <div className="filters">
            <button className={`chip ${activeCat === 'all' ? 'on' : ''}`} onClick={() => setActiveCat('all')}>{t('catalog.all')}</button>
            {categories.map((c) => (
              <button key={c.id} className={`chip ${activeCat === c.id ? 'on' : ''}`} onClick={() => setActiveCat(c.id)}>
                {c.name}<span className="ct">{c.count}</span>
              </button>
            ))}
          </div>

          <div className="prod-grid">
            {items.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pg-btn nav" disabled={page === 1} onClick={() => goPage(page - 1)}>
                <PageArrowPrev />{t('catalog.prev')}
              </button>
              {nums.map((n, i) =>
                n === '…' ? (
                  <span key={`e${i}`} className="pg-ell">…</span>
                ) : (
                  <button key={n} className={`pg-btn ${page === n ? 'on' : ''}`} onClick={() => goPage(n as number)} aria-current={page === n ? 'page' : undefined}>{n}</button>
                )
              )}
              <button className="pg-btn nav" disabled={page === totalPages} onClick={() => goPage(page + 1)}>
                {t('catalog.next')}<PageArrowNext />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- brands ---------- */

export function BrandBrands({ brands }: { brands: BrandBrandItem[] }) {
  const { t } = useBrand()
  const ref = useFade()
  return (
    <section id="brands" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('brands.kicker')}</span>
              <h2 className="h-sec">{t('brands.h1')} <span className="tealtext">{t('brands.h2')}</span></h2>
            </div>
          </div>
          <div className="brand-grid">
            {brands.map((b) => (
              <Link key={b.id} className="brandcard" href={`/brands/${b.id}`}>
                <span className="lg">{b.name}</span>
                <span className="cs">{b.count} {t('catalog.resultsWord')}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- services ---------- */

export function BrandServices() {
  const { t } = useBrand()
  const ref = useFade()
  const items = [
    { tt: t('v1t'), d: t('v1d'), ic: <IcTruck s={22} /> },
    { tt: t('v2t'), d: t('v2d'), ic: <IcShield s={22} /> },
    { tt: t('v3t'), d: t('v3d'), ic: <IcRepair s={22} /> },
    { tt: t('v4t'), d: t('v4d'), ic: <IcChat s={22} /> },
  ]
  return (
    <section className="sec line-top" id="services">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('serv.k')}</span>
              <h2 className="h-sec">{t('serv.h')}</h2>
              <p className="lead">{t('serv.sub')}</p>
            </div>
          </div>
          <div className="serv-grid">
            {items.map((it, i) => (
              <div key={i} className="serv">
                <span className="sic">{it.ic}</span>
                <div className="st">{it.tt}</div>
                <div className="sd">{it.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- about ---------- */

export function BrandAbout() {
  const { t } = useBrand()
  const ref = useFade()
  const tl = [
    { yr: '2006', tt: 'Hardware Technology Services', ds: t('tl.2006d') },
    { yr: '2012', tt: t('tl.2012t'), ds: t('tl.2012d') },
    { yr: '2017', tt: t('tl.2017t'), ds: t('tl.2017d') },
    { yr: '2022', tt: t('tl.2022t'), ds: 'HP, Dell, Lenovo, ASUS, Canon, Epson, TP-Link.' },
    { yr: '2026', tt: t('tl.2026t'), ds: t('tl.2026d') },
  ]
  return (
    <section id="about" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('about.kicker')}</span>
              <h2 className="h-sec">{t('about.h1')} <span className="tealtext">{t('about.h2')}</span>{t('about.h3')}</h2>
            </div>
          </div>
          <div className="about-grid">
            <div className="about-text">
              <p dangerouslySetInnerHTML={{ __html: t('about.p1') }} />
              <p dangerouslySetInnerHTML={{ __html: t('about.p2') }} />
            </div>
            <div className="about-stats">
              <div className="ab-st"><div className="v"><Counter to={2006} /></div><div className="l">{t('about.s1l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={30000} /><span className="u">+</span></div><div className="l">{t('about.s2l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={7} /><span className="u">{t('about.s3u')}</span></div><div className="l">{t('about.s3l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={44} /><span className="u">{t('about.s4u')}</span></div><div className="l">{t('about.s4l')}</div></div>
            </div>
          </div>
          <div className="htl">
            {tl.map((it) => (
              <div key={it.yr} className="htl-item">
                <div className="yr">{it.yr}</div>
                <div className="tt">{it.tt}</div>
                <div className="ds">{it.ds}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- contact ---------- */

export function BrandContact() {
  const { t } = useBrand()
  const ref = useFade()
  const [tab, setTab] = useState<'show' | 'comm' | 'sav'>('show')
  const today = new Date().getDay()
  const days = [
    { id: 1, o: '09:00', c: '17:00' },
    { id: 2, o: '09:00', c: '17:00' },
    { id: 3, o: '09:00', c: '17:00' },
    { id: 4, o: '09:00', c: '17:00' },
    { id: 5, o: null as string | null, c: '' },
    { id: 6, o: null as string | null, c: '' },
    { id: 0, o: '09:00', c: '17:00' },
  ]
  const data = {
    show: { phone: t('show.phone'), email: 'contact@dtech.dz', addr: t('show.addr'), hours: t('show.hours') },
    comm: { phone: '+213 560 99 05 06', email: 'commercial@dtech.dz', addr: t('comm.addr'), hours: t('comm.hours') },
    sav: { phone: '+213 561 61 69 11', email: 'sav@dtech.dz', addr: t('sav.addr'), hours: t('sav.hours') },
  }[tab]

  return (
    <section id="contact" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('contact.kicker')}</span>
              <h2 className="h-sec">{t('contact.h1')} <span className="tealtext">{t('contact.h2')}</span></h2>
              <p className="lead">{t('contact.sub')}</p>
            </div>
          </div>

          <div className="contact-grid">
            <div className="map-panel">
              <svg className="map-roads" viewBox="0 0 600 460" preserveAspectRatio="none" aria-hidden>
                <path d="M-20 150 C150 140 360 175 640 150" stroke="var(--line-2)" strokeWidth="10" fill="none" />
                <path d="M-20 320 C150 312 360 340 640 322" stroke="var(--line-2)" strokeWidth="7" fill="none" />
                <path d="M210 -20 C220 160 200 320 240 480" stroke="var(--line-2)" strokeWidth="7" fill="none" />
                <path d="M430 -20 C440 160 420 320 460 480" stroke="var(--line-2)" strokeWidth="9" fill="none" />
              </svg>
              <div className="map-info">
                <span className="live">● {t('map.open')}</span>
                <div className="nm">{t('map.name')}</div>
                <div className="ad">{t('map.addr1')}<br />{t('map.addr2')}</div>
                <div className="co">36°43′N · 03°11′E</div>
              </div>
              <span className="poi" style={{ left: '20%', top: '62%' }}><i />USTHB</span>
              <span className="poi" style={{ left: '70%', top: '40%' }}><i />C.C. Bab Ezzouar</span>
              <div className="pin">
                <span className="pulse" /><span className="pulse r2" />
                <span className="core" />
                <span className="lbl">{t('map.pin')}</span>
              </div>
            </div>

            <div className="contact-card">
              <div className="ci-tabs">
                <button className={`ci-tab ${tab === 'show' ? 'on' : ''}`} onClick={() => setTab('show')}>{t('tab.show')}</button>
                <button className={`ci-tab ${tab === 'comm' ? 'on' : ''}`} onClick={() => setTab('comm')}>{t('tab.comm')}</button>
                <button className={`ci-tab ${tab === 'sav' ? 'on' : ''}`} onClick={() => setTab('sav')}>{t('tab.sav')}</button>
              </div>
              <div className="ci-body">
                <div className="ci-row"><span className="l">{t('row.phone')}</span><span className="v">{data.phone}</span></div>
                <div className="ci-row"><span className="l">{t('row.email')}</span><span className="v">{data.email}</span></div>
                <div className="ci-row"><span className="l">{t('row.service')}</span><span className="v">{data.addr}<small>{data.hours}</small></span></div>
                <div className="ci-actions">
                  <a className="ci-act" href={`tel:${data.phone.replace(/\s/g, '')}`}><PhoneIcon />{t('act.call')}</a>
                  <a className="ci-act" href="https://maps.google.com/?q=Bab+Ezzouar+Alger" target="_blank" rel="noopener noreferrer"><RouteIcon />{t('act.route')}</a>
                  <a className="ci-act" href={`https://wa.me/${BRAND_WHATSAPP}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon s={19} />WhatsApp</a>
                </div>
                <div className="hours">
                  <h5>{t('hours.title')}</h5>
                  {days.map((d) => (
                    <div key={d.id} className={`hrow ${d.id === today ? 'today' : ''} ${d.o ? '' : 'closed'}`}>
                      <span className="d">{t('day.' + d.id)}{d.id === today ? ' · ' + t('hours.today') : ''}</span>
                      <span>{d.o ? `${d.o} – ${d.c}` : t('hours.closed')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
