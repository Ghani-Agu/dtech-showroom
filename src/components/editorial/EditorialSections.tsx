'use client'

/**
 * Éditorial homepage sections — VERBATIM port of dtech-ed-sections.jsx and
 * the hero/marquee/band primitives from dtech-ed-parts.jsx, fed by the REAL
 * catalogue (EdData). The DB has no price column, so every "À partir de X DA"
 * becomes the design's own fallback « Sur devis ».
 * [PORT] markers note the intentional adaptations.
 */

import { useCallback, useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { EIcon, WaIcon } from './editorial-icons'
import { WA, ED_PHONE_TEL, ED_PHONE_DISPLAY, ED_EMAIL, ED_SAV_TEL } from './EditorialChrome'
import { edCountWord } from './editorial-i18n'
import { ED_TIER_COLORS, ED_TIERS_MAX, ED_WORKSTATION_SLUGS, type EdBento, type EdBentoProd, type EdCat, type EdData } from './editorial-types'
import { ED_BRAND_LOGOS, EdLogo } from './editorial-logos'

/* ─────────── shared primitives (design SplitH2 / SecHead / Curtain) ─────────── */

function Words({ children }: { children: string }) {
  return (
    <>
      {children.split(' ').map((w, i) => (
        <span className="sw" key={i} style={{ '--w': i } as React.CSSProperties}>
          {w}
        </span>
      ))}
    </>
  )
}

function SecHead({ kicker, title, lede }: { kicker?: string; title: string; lede?: string }) {
  return (
    <div className="sec-head rv">
      {kicker && <div className="eyebrow">{kicker}</div>}
      <h2 className="h2">
        <Words>{title}</Words>
      </h2>
      {lede && <p className="lede">{lede}</p>}
    </div>
  )
}

export function Curtain({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const cur = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    let raf = 0
    const upd = () => {
      raf = 0
      const el = ref.current
      const c = cur.current
      if (!el || !c) return
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      const p = Math.max(0, Math.min(1, (vh - r.bottom) / (vh * 0.5)))
      c.style.setProperty('--p', p.toFixed(3))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(upd)
    }
    upd()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div className="cw" ref={ref}>
      {children}
      <div className="curtain" ref={cur}></div>
    </div>
  )
}

function Slot({ label }: { label: string }) {
  return (
    <span className="ed-slot">
      <i>{label}</i>
    </span>
  )
}

/* ─────────── hero (design EdHero) ─────────── */

export function EdHero({ heroImage }: { heroImage: string | null }) {
  const { t } = useEditorial()
  return (
    <header className="hero" id="accueil" data-band="dark">
      <div className="hero-card">
        <div className="hero-img">
          {heroImage ? (
            <Image src={heroImage} alt="" fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
          ) : (
            <Slot label={t('hero.ph')} />
          )}
        </div>
        <div className="hero-scrim"></div>
        <div className="hero-scrim2"></div>
        <div className="hero-in hero-anim">
          <div className="hero-mark gmark">
            D-tech<span>.</span>
          </div>
          <h1>
            {t('hero.title1')}
            <br />
            {t('hero.title2')}
          </h1>
          <p>{t('hero.lede')}</p>
          <div className="hero-tag">{t('hero.tag')}</div>
          <div className="hero-btns">
            <a className="btn btn-w" href="#catalogue">
              {t('hero.cta1')}
            </a>
            <a className="btn btn-g" href={WA} target="_blank" rel="noopener noreferrer">
              <WaIcon s={17} />
              {t('hero.cta2')}
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─────────── catalogue carousel (design EdCatalogue) ─────────── */

export function EdCatalogue({ data }: { data: EdData }) {
  const { t, lang, dir } = useEditorial()
  const track = useRef<HTMLDivElement | null>(null)
  const [ends, setEnds] = useState([true, false])
  const sync = useCallback(() => {
    const el = track.current
    if (!el) return
    const x = Math.abs(el.scrollLeft)
    setEnds([x < 8, x + el.clientWidth > el.scrollWidth - 8])
  }, [])
  useEffect(() => {
    sync()
    addEventListener('resize', sync)
    return () => removeEventListener('resize', sync)
  }, [sync])
  const go = (d: number) => {
    const el = track.current
    if (!el) return
    const rtl = dir === 'rtl' ? -1 : 1
    el.scrollBy({ left: d * rtl * (el.clientWidth * 0.72), behavior: 'smooth' })
  }
  const title = `${edCountWord(lang, data.cats.length)} ${t('cat.title')}`
  return (
    <section className="sec" id="catalogue">
      <div className="wrap">
        <div className="car-head rv">
          <div className="t">
            <div className="eyebrow">{t('cat.eyebrow')}</div>
            <h2 className="h2">
              <Words>{title}</Words>
            </h2>
            <p className="lede">{t('cat.lede')}</p>
          </div>
          <div className="car-nav">
            <button className="car-btn" onClick={() => go(-1)} disabled={ends[0]} aria-label={t('aria.prev')}>
              <EIcon n="chevL" s={18} />
            </button>
            <button className="car-btn" onClick={() => go(1)} disabled={ends[1]} aria-label={t('aria.next')}>
              <EIcon n="chevR" s={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="car" ref={track} onScroll={sync}>
        {data.cats.map((c, i) => (
          /* [PORT] design cards deep-link to WhatsApp; the live site opens the
             catalogue pre-filtered on the clicked family. */
          <Link className="ccard" key={c.id} href={`/products?category=${c.id}`}>
            <div className="ccard-img">
              {c.img ? (
                <Image src={c.img} alt="" fill sizes="(max-width: 1024px) 84vw, 540px" style={{ objectFit: 'cover' }} />
              ) : (
                <Slot label={c.name} />
              )}
            </div>
            <div className="ccard-tint"></div>
            <div className="ccard-in">
              <div className="ccard-top">
                <span className="chip">
                  <EIcon n={c.icon} s={20} />
                </span>
                <span className="ccount">
                  {String(i + 1).padStart(2, '0')} / {String(data.cats.length).padStart(2, '0')}
                </span>
              </div>
              <div>
                <div className="ccard-from">
                  {t('cat.from')} · {c.count} {t('cat.refs')}
                </div>
                <h3>{c.name}</h3>
                <div className="ccard-more">
                  <div>
                    <p>{c.desc}</p>
                    <span className="arrow">
                      <EIcon n="arrow" s={16} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ─────────── proof: quote + counters (design EdProof / CountUp) ─────────── */

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const dur = 1100
        const tick = (ts: number) => {
          const p = Math.min(1, (ts - t0) / dur)
          setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])
  return (
    <span ref={ref}>
      {v}
      {suffix}
    </span>
  )
}

export function EdProof({ data }: { data: EdData }) {
  const { t } = useEditorial()
  return (
    <section className="sec" style={{ background: 'var(--wash)' }}>
      <div className="wrap rv">
        <div className="quote">
          <div className="rule">
            <span className="eyebrow">{t('proof.eyebrow')}</span>
          </div>
          <blockquote>{t('proof.quote')}</blockquote>
          <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{t('proof.attrib')}</div>
        </div>
        <div className="stats">
          <div className="stat stag" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="n">
              <CountUp to={data.productCount} suffix="+" />
            </div>
            <p>{t('proof.s1')}</p>
          </div>
          <div className="stat stag" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="n">
              <CountUp to={data.brandCount} />
            </div>
            <p>{t('proof.s2')}</p>
          </div>
          <div className="stat stag" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="n" style={{ color: 'var(--teal-deep)' }}>
              <CountUp to={58} />
            </div>
            <p>{t('proof.s3')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────── brand marquee + services (design EdMarquee) ─────────── */

export function EdMarquee({ data }: { data: EdData }) {
  const { t } = useEditorial()
  /* [PORT+] only the big marks ride the slider — real vector logos, one
     distinct color per brand. Everyone else stays in the catalogue filter. */
  const bigs = data.brands.filter((b) => ED_BRAND_LOGOS[b.id])
  const items = [...bigs, ...bigs]
  const services: [string, string][] = [
    ['truck', t('mq.svc1')],
    ['wrench', t('mq.svc2')],
    ['shield', t('mq.svc3')],
    ['bolt', t('mq.svc4')],
  ]
  return (
    <section className="sec" id="marques" style={{ background: 'var(--wash)' }}>
      <div className="wrap">
        <SecHead kicker={t('mq.eyebrow')} title={t('mq.title')} lede={t('mq.lede')} />
      </div>
      <div className="mq">
        <div className="mq-row">
          {items.map((b, i) => {
            const logo = ED_BRAND_LOGOS[b.id]
            if (!logo) return null
            return (
              <Link
                className="mq-card"
                key={`${b.id}-${i}`}
                href={`/products?brand=${b.id}`}
                style={{ '--tile': logo.tile, '--tfg': logo.fg } as React.CSSProperties}
                aria-hidden={i >= bigs.length || undefined}
                tabIndex={i >= bigs.length ? -1 : undefined}
                aria-label={`${b.name} — ${b.count} ${t('mq.products')}`}
              >
                <span className="mq-logo">
                  <EdLogo slug={b.id} />
                </span>
                <span className="mq-meta">
                  <span className="mq-n">
                    {b.count} {t('mq.products')}
                  </span>
                  <span className="mq-go">
                    <EIcon n="arrow" s={14} />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <p className="mq-more rv">
        {t('mq.more')} <Link href="/products">{t('mq.moreLink')}</Link>
      </p>
      <div className="wrap">
        <div className="dash"></div>
        <div className="center eyebrow" style={{ marginBottom: 26 }}>
          {t('mq.services')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 42px', justifyContent: 'center' }}>
          {services.map(([ic, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--ink-2)' }}>
              <EIcon n={ic} s={18} style={{ color: 'var(--teal)' }} />
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── editorial photo band (design EdBand) ─────────── */

/* [PORT+] lorolabs-style slide reveal — the photo parallax-slides upward
   and sheds a dark veil while the band crosses the viewport (scroll-driven
   --p, same rAF pattern as the fan). */
function useScrollP(ref: { current: HTMLElement | null }) {
  useEffect(() => {
    let raf = 0
    const upd = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)))
      el.style.setProperty('--p', p.toFixed(3))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(upd)
    }
    upd()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function EdBand({ img, cap, ph, pos = 'tl' }: { img?: string | null; cap: string; ph: string; pos?: 'tl' | 'br' }) {
  const ref = useRef<HTMLElement | null>(null)
  useScrollP(ref)
  return (
    <section className="band" data-band="dark" ref={ref}>
      <div className="band-media">
        {img ? <Image src={img} alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} /> : <Slot label={ph} />}
      </div>
      <span className="band-veil" aria-hidden />
      <div className={`band-cap ${pos}`}>{cap}</div>
    </section>
  )
}

/* [PORT+] history band — the dedicated photo + typeset story on top:
   color-animated "D-tech." wordmark, the since-2014 line, live counters
   from the real catalogue, and a strip of catalogue thumbnails that
   deep-link into the filtered catalogue. Same slide-reveal as EdBand. */
export function EdHistory({ data }: { data: EdData }) {
  const { t } = useEditorial()
  const ref = useRef<HTMLElement | null>(null)
  useScrollP(ref)
  const refsCount = Math.max(10, Math.floor(data.productCount / 10) * 10)
  const thumbs = data.cats.filter((c) => c.img).slice(0, 6)
  const more = Math.max(0, data.cats.length - thumbs.length)
  return (
    <section className="band hist" data-band="dark" ref={ref}>
      <div className="band-media">
        <Image src="/images/editorial/band-history.webp" alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} />
      </div>
      <span className="hist-scrim" aria-hidden />
      <span className="band-veil" aria-hidden />
      <div className="hist-in">
        <div className="hist-mark">D-tech.</div>
        <p className="hist-sub">{t('hist.sub')}</p>
        <div className="hist-stats">
          <div>
            <b>{refsCount}+</b>
            <span>{t('hist.refs')}</span>
          </div>
          <div>
            <b>{data.brandCount}</b>
            <span>{t('hist.brands')}</span>
          </div>
          <div>
            <b>58</b>
            <span>{t('hist.wilayas')}</span>
          </div>
        </div>
        <div className="hist-cats">
          {thumbs.map((c) => (
            <Link key={c.id} href={`/products?category=${c.id}`} className="hist-chip" aria-label={c.name}>
              {c.img ? <Image src={c.img} alt="" fill sizes="90px" style={{ objectFit: 'cover' }} /> : null}
            </Link>
          ))}
          {more > 0 && (
            <Link href="/products" className="hist-chip hist-more">
              +{more}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}


/* [PORT+] bento objects — realistic dark-studio CSS renders:
   laptop (config) / gear (SAV) / invoice stack (facture) / parcels (livraison) */
function CubeFaces() {
  return (
    <>
      <span className="f fA" />
      <span className="f fB" />
      <span className="f fC" />
      <span className="f fD" />
      <span className="f fT" />
      <span className="f fBo" />
    </>
  )
}

function Ed3D({ v }: { v: 1 | 2 | 3 | 4 }) {
  return (
    <div className={`e3d v${v}`} aria-hidden>
      <span className="shadow" />
      {v === 1 && (
        <div className="lap3">
          <div className="lap3-scr" />
          <div className="lap3-base" />
        </div>
      )}
      {v === 2 && (
        <div className="gear3">
          <span className="gear3-ring" />
          {Array.from({ length: 9 }, (_, i) => (
            <span className="gear3-t" key={i} style={{ '--a': `${i * 40}deg` } as React.CSSProperties} />
          ))}
          <span className="gear3-hub" />
        </div>
      )}
      {v === 3 && (
        <>
          <span className="inv i1" />
          <span className="inv i2" />
          <span className="inv i3" />
        </>
      )}
      {v === 4 && (
        <>
          <div className="obj">
            <CubeFaces />
          </div>
          <div className="mini">
            <CubeFaces />
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────── bento why (design EdWhy) ─────────── */

/* [PORT+] the bento media are real shop artifacts, not renders: actual
   product photos on the test bench / SAV card, a typeset quote document
   with real model names, a delivery tracking slip. Falls back to the CSS
   objects when no catalogue data is passed (About page). */

/* Each artifact scene lives in a 3D stage: layered translateZ depths give
   the objects physical thickness, and the whole scene tilts toward the
   cursor (pointer parallax, hover devices only). */
function Tilt({ children, max = 8 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!matchMedia('(hover:hover)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const zone = (el.closest('.bt') as HTMLElement | null) ?? el
    let raf = 0
    const onMove = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const r = zone.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        el.style.setProperty('--ry', `${(px * max * 2).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${(-py * max * 2).toFixed(2)}deg`)
      })
    }
    const onLeave = () => {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerleave', onLeave)
    return () => {
      zone.removeEventListener('pointermove', onMove)
      zone.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [max])
  return (
    <div className="b3d" ref={ref}>
      {children}
    </div>
  )
}

function BenchMedia({ items, label }: { items: EdBentoProd[]; label: string }) {
  if (!items.length) return <Ed3D v={1} />
  return (
    <Tilt>
    <div className="bench" aria-hidden>
      {items.map((p, i) => (
        <figure className="bch" key={`${p.name}-${i}`} style={{ '--bi': i } as React.CSSProperties}>
          <span className="bch-img">
            {p.img ? (
              <Image src={p.img} alt="" fill sizes="180px" style={{ objectFit: 'contain' }} />
            ) : null}
          </span>
          <figcaption>
            <b>{p.cat}</b>
            <i>{p.name}</i>
          </figcaption>
        </figure>
      ))}
      <span className="bench-line">
        <em>{label}</em>
      </span>
    </div>
    </Tilt>
  )
}

function SavMedia({ item, t }: { item: EdBentoProd | null; t: (k: string) => string }) {
  if (!item) return <Ed3D v={2} />
  return (
    <Tilt>
    <div className="sav" aria-hidden>
      <span className="sav-img">
        {item.img ? (
          <Image src={item.img} alt="" fill sizes="240px" style={{ objectFit: 'contain' }} />
        ) : null}
      </span>
      <div className="sav-tkt">
        <span className="tkt-head">
          {t('why.sav.ticket')} <b className="mono">SAV-2214</b>
        </span>
        <span className="tkt-step done">
          <i />
          {t('why.sav.s1')}
        </span>
        <span className="tkt-step done">
          <i />
          {t('why.sav.s2')}
        </span>
        <span className="tkt-step run">
          <i />
          {t('why.sav.s3')}
        </span>
      </div>
    </div>
    </Tilt>
  )
}

function QuoteMedia({ rows, t }: { rows: { name: string; cat: string }[]; t: (k: string) => string }) {
  if (!rows.length) return <Ed3D v={3} />
  return (
    <Tilt>
    <div className="fact" aria-hidden>
      <span className="fact-back" />
      <div className="fact-doc">
        <header>
          <b className="fact-mark">
            D-tech<span>.</span>
          </b>
          <span className="mono">
            {t('why.fact.no')} 2026-0148 · {t('why.fact.date')}
          </span>
        </header>
        {rows.map((r) => (
          <div className="fact-row" key={r.name}>
            <span className="fact-name">{r.name}</span>
            <span className="fact-dots" />
            <span className="mono">{t('why.fact.sur')}</span>
          </div>
        ))}
        <div className="fact-tot">
          <span className="mono">{t('why.fact.total')}</span>
          <b>{t('why.fact.sur')}</b>
        </div>
        <footer className="mono">{t('why.fact.foot')}</footer>
        <span className="fact-stamp">{t('why.fact.stamp')}</span>
      </div>
    </div>
    </Tilt>
  )
}

function ShipMedia({ t }: { t: (k: string) => string }) {
  return (
    <Tilt>
    <div className="ship" aria-hidden>
      <header className="ship-top">
        <b>{t('why.ship.co')}</b>
        <span className="mono">Nº DZ-58-2214</span>
      </header>
      <div className="ship-route">
        <b>{t('why.ship.from')}</b>
        <span className="ship-line">
          <i className="ship-truck">
            <EIcon n="truck" s={13} />
          </i>
        </span>
        <b>{t('why.ship.dest')}</b>
      </div>
      <span className="ship-bar" />
      <div className="ship-steps">
        <span className="done">
          <EIcon n="check" s={12} />
          {t('why.ship.s1')}
        </span>
        <span className="done">
          <EIcon n="check" s={12} />
          {t('why.ship.s2')}
        </span>
        <span className="run">
          <i />
          {t('why.ship.s3')}
        </span>
      </div>
      <span className="ship-cod mono">{t('why.ship.cod')}</span>
    </div>
    </Tilt>
  )
}

export function EdWhy({ bento }: { bento?: EdBento }) {
  const { t } = useEditorial()
  const items = [
    { k: 'bt-a', ic: 'bolt', n: 1, mediaFirst: false },
    { k: 'bt-b', ic: 'wrench', n: 2, mediaFirst: true },
    { k: 'bt-c', ic: 'shield', n: 3, mediaFirst: true },
    { k: 'bt-d', ic: 'truck', n: 4, mediaFirst: true },
  ] as const
  const mediaOf = (n: 1 | 2 | 3 | 4) => {
    if (n === 1) return <BenchMedia items={bento?.shelf ?? []} label={t('why.bench')} />
    if (n === 2) return <SavMedia item={bento?.sav ?? null} t={t} />
    if (n === 3) return <QuoteMedia rows={bento?.invoice ?? []} t={t} />
    return <ShipMedia t={t} />
  }
  return (
    <section className="sec" id="pourquoi" style={{ background: 'var(--wash2)' }}>
      <div className="wrap rv">
        <SecHead kicker={t('why.eyebrow')} title={t('why.title')} />
        <div className="bento">
          {items.map((w, i) => {
            const media = <div className="bt-media">{mediaOf(w.n as 1 | 2 | 3 | 4)}</div>
            const txt = (
              <div className="bt-txt">
                <h3>
                  <EIcon n={w.ic} s={18} style={{ color: 'var(--yellow)' }} />
                  {t(`why.${w.n}.t`)}
                </h3>
                <p>{t(`why.${w.n}.p`)}</p>
              </div>
            )
            return (
              <article className={`bt ${w.k} stag`} key={w.k} style={{ '--i': i } as React.CSSProperties}>
                {w.mediaFirst ? media : txt}
                {w.mediaFirst ? txt : media}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────── tiers accordion (design EdTiers) ─────────── */

/* [PORT+] lorolabs-style accordion sound — one soft piano note per row.
   WebAudio unlocks on the first pointerdown (browser autoplay policy). */
let edAudio: AudioContext | null = null
function edEnsureAudio() {
  try {
    if (!edAudio) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      edAudio = new AC()
    }
    if (edAudio.state === 'suspended') void edAudio.resume().catch(() => undefined)
    return edAudio
  } catch {
    return null
  }
}
function edNote(i: number) {
  const ctx = edEnsureAudio()
  if (!ctx || ctx.state !== 'running') return
  const steps = [0, 2, 4, 7, 9] // pentatonic — every neighbour sounds good
  const semi = (steps[i % steps.length] ?? 0) + 12 * Math.floor(i / steps.length)
  const freq = 261.63 * Math.pow(2, semi / 12)
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const g = ctx.createGain()
  const g2 = ctx.createGain()
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2600
  osc.type = 'triangle'
  osc.frequency.value = freq
  osc2.type = 'sine'
  osc2.frequency.value = freq * 2
  g2.gain.value = 0.22
  osc.connect(g)
  osc2.connect(g2)
  g2.connect(g)
  g.connect(lp)
  lp.connect(ctx.destination)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.085, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
  osc.start(t)
  osc2.start(t)
  osc.stop(t + 0.6)
  osc2.stop(t + 0.6)
}



export function EdTiers({ data }: { data: EdData }) {
  const { t } = useEditorial()
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    const unlock = () => edEnsureAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  /* [PORT+] only the main ranges — top of each group by stock, catalogue
     order preserved. The long tail lives in /products (link under the list). */
  const topByCount = (rows: EdCat[], n: number) => {
    const keep = new Set(
      [...rows]
        .sort((a, b) => b.count - a.count)
        .slice(0, n)
        .map((c) => c.id)
    )
    return rows.filter((c) => keep.has(c.id))
  }
  const work = topByCount(
    data.cats.filter((c) => ED_WORKSTATION_SLUGS.includes(c.id)),
    ED_TIERS_MAX.work
  )
  const rest = topByCount(
    data.cats.filter((c) => !ED_WORKSTATION_SLUGS.includes(c.id)),
    ED_TIERS_MAX.rest
  )
  const colorOf = (i: number) => ED_TIER_COLORS[i % ED_TIER_COLORS.length]
  const hoverOpen = (c: EdCat, gi: number) => {
    if (!matchMedia('(hover:hover)').matches) return
    setOpen((prev) => {
      if (prev !== c.id) edNote(gi)
      return c.id
    })
  }
  /* Light panels (amber, lime…) flip to ink text — decided by luminance so
     the palette can change freely without touching this logic. */
  const isLightHex = (hex: string | undefined) => {
    if (!hex) return false
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return 0.299 * r + 0.587 * g + 0.114 * b > 150
  }
  const Row = (c: EdCat, gi: number) => {
    const isOpen = open === c.id
    const color = colorOf(gi)
    const light = isLightHex(color)
    return (
      <Fragment key={c.id}>
        <button
          className="tier"
          aria-expanded={isOpen}
          onMouseEnter={() => hoverOpen(c, gi)}
          onClick={() => {
            if (open !== c.id) edNote(gi)
            setOpen(isOpen ? null : c.id)
          }}
        >
          <span className="ic">
            <EIcon n={c.icon} s={20} />
          </span>
          <span className="nm">{c.name}</span>
          {c.id === 'laptops' && <span className="pop">{t('tiers.pop')}</span>}
          <span className="sp"></span>
          <span className="pr">
            {c.count} {t('tiers.refs')} · {t('tiers.surdevis')}
          </span>
          <span className="gl">
            <EIcon n="plus" s={16} />
          </span>
        </button>
        {isOpen && (
          <div className={`panel${light ? ' light' : ''}`} style={{ background: color }}>
            <div>
              <h3>
                <EIcon n={c.icon} s={20} />
                {c.name}
              </h3>
              <p className="desc">{c.desc}</p>
              <div className="big">
                {c.count} {t('tiers.refs')}
              </div>
              <div className="panel-ctas">
                <a
                  className="btn btn-w"
                  href={`${WA}?text=${encodeURIComponent(t('tiers.wa') + c.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WaIcon s={17} />
                  {t('tiers.cta')}
                </a>
                <Link className="panel-browse" href={`/products?category=${c.id}`}>
                  {t('tiers.browse')}
                </Link>
              </div>
            </div>
            <ul>
              {c.tops.map((name) => (
                <li key={name}>
                  <EIcon n="check" s={16} style={{ opacity: 0.8 }} />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Fragment>
    )
  }
  return (
    <section className="sec" id="gammes">
      <div className="wrap rv">
        <SecHead kicker={t('tiers.eyebrow')} title={t('tiers.title')} lede={t('tiers.lede')} />
        <div className="tiers">
          <div className="tier-lab">{t('tiers.lab1')}</div>
          {work.map((c, i) => Row(c, i))}
          <div className="tier-lab" style={{ marginTop: 48 }}>
            {t('tiers.lab2')}
          </div>
          {rest.map((c, i) => Row(c, i + work.length))}
          <p className="tiers-note">
            {t('tiers.note')}{' '}
            <a href={WA} target="_blank" rel="noopener noreferrer">
              {t('tiers.noteLink')}
            </a>
          </p>
          <p className="tiers-note">
            {t('tiers.more')} <Link href="/products">{t('tiers.moreLink')}</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────── card fan (design EdFan) ─────────── */

export function EdFan({ data }: { data: EdData }) {
  const { t } = useEditorial()
  const fanRef = useRef<HTMLDivElement | null>(null)
  const cards = data.cats.slice(0, 7)
  const mid = (cards.length - 1) / 2
  useEffect(() => {
    let raf = 0
    const upd = () => {
      raf = 0
      const el = fanRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      const p = Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.5)))
      el.style.setProperty('--p', p.toFixed(3))
    }
    const on2 = () => {
      if (!raf) raf = requestAnimationFrame(upd)
    }
    upd()
    addEventListener('scroll', on2, { passive: true })
    addEventListener('resize', on2)
    return () => {
      removeEventListener('scroll', on2)
      removeEventListener('resize', on2)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <section className="sec" style={{ background: 'var(--wash2)', overflow: 'hidden' }}>
      <div className="wrap rv">
        <SecHead kicker={t('fan.eyebrow')} title={t('fan.title')} lede={t('fan.lede')} />
        <div className="fan" ref={fanRef}>
          {cards.map((c, i) => {
            const d = i - mid
            const st = {
              '--x': `${d * 78}px`,
              '--r2': `${d * 5}deg`,
              '--y': `${Math.abs(d) * 13}px`,
              '--sd': Math.abs(d) * 0.03,
              zIndex: 10 - Math.abs(d),
            } as React.CSSProperties
            return (
              /* [PORT+] a tap goes straight to the pre-filtered catalogue. */
              <Link className="fcard" key={c.id} style={st} href={`/products?category=${c.id}`}>
                <span className="fi">
                  {c.img ? (
                    <Image src={c.img} alt="" fill sizes="210px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <Slot label={c.name} />
                  )}
                </span>
                <span className="fo"></span>
                <span className="fl">
                  <span className="k">
                    {c.count} {t('fan.refs')}
                  </span>
                  <h4>{c.name}</h4>
                </span>
              </Link>
            )
          })}
        </div>
        <div className="fan-foot">
          <Link href="/products" style={{ fontWeight: 600 }}>
            {t('fan.foot')}
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────── shop demo (design EdDemo) ─────────── */

export function EdDemo({ screenshot }: { screenshot?: string | null }) {
  const { t } = useEditorial()
  return (
    <section className="sec">
      <div className="wrap rv">
        <SecHead kicker={t('demo.eyebrow')} title={t('demo.title')} lede={t('demo.lede')} />
        <div className="demo">
          <span className="demo-glow"></span>
          {/* [PORT] design links to WhatsApp; the live site opens its real catalogue */}
          <Link className="demo-card" href="/products">
            <div className="demo-bar">
              <span className="demo-dots">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className="demo-url">
                <em></em>
                {t('demo.url')}
              </span>
              <span className="demo-go">{t('demo.go')}</span>
            </div>
            <div className="demo-screen">
              {screenshot ? (
                <Image src={screenshot} alt="" fill sizes="960px" style={{ objectFit: 'cover' }} />
              ) : (
                <Slot label={t('demo.ph')} />
              )}
            </div>
          </Link>
        </div>
        <div className="demo-foot">
          <a className="btn btn-k" href={WA} target="_blank" rel="noopener noreferrer">
            <WaIcon s={17} />
            {t('demo.cta')}
          </a>
          <span className="demo-note">{t('demo.note')}</span>
        </div>
      </div>
    </section>
  )
}

/* ─────────── contact (design EdContact) ─────────── */

export function EdContact() {
  const { t } = useEditorial()
  return (
    <section className="sec" id="contact">
      <div className="wrap rv center">
        <SecHead kicker={t('contact.eyebrow')} title={t('contact.title')} lede={t('contact.lede')} />
        <a className="gborder" href={WA} target="_blank" rel="noopener noreferrer">
          <span className="gbtn">{t('contact.btn')}</span>
        </a>
        <div className="cinfo">
          <a href={`tel:${ED_PHONE_TEL}`}>
            <EIcon n="tel" s={17} />
            {ED_PHONE_DISPLAY}
          </a>
          <a href={`mailto:${ED_EMAIL}`}>
            <EIcon n="mail" s={17} />
            {ED_EMAIL}
          </a>
          <a href={`tel:${ED_SAV_TEL}`}>
            <EIcon n="wrench" s={17} />
            SAV · 0561 616 911
          </a>
        </div>
        <div className="cinfo" style={{ marginTop: 14 }}>
          <span>
            <EIcon n="pin" s={17} />
            {t('contact.addr')}
          </span>
          <span>
            <EIcon n="clock" s={17} />
            {t('contact.hours')}
          </span>
        </div>
      </div>
    </section>
  )
}
