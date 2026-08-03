'use client'

/**
 * Éditorial homepage sections — VERBATIM port of dtech-ed-sections.jsx and
 * the hero/marquee/band primitives from dtech-ed-parts.jsx, fed by the REAL
 * catalogue (EdData). The DB has no price column, so every "À partir de X DA"
 * becomes the design's own fallback « Sur devis ».
 * [PORT] markers note the intentional adaptations.
 */

import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { setVar, useAnimGate, useMedia, useScrollFx } from './ed-scroll'
import { EIcon, WaIcon } from './editorial-icons'
import { WA, ED_PHONE_TEL, ED_PHONE_DISPLAY, ED_EMAIL, ED_SAV_TEL } from './EditorialChrome'
import { edCountWord } from './editorial-i18n'
import { ED_TIER_COLORS, ED_TIERS_MAX, ED_WORKSTATION_SLUGS, type EdBento, type EdCat, type EdData, type EdHeroSlide } from './editorial-types'
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
  /* ROUND 21 — read and write phases split by the shared scheduler, see
     ed-scroll.ts. Was its own scroll listener + rAF. */
  useScrollFx(
    () => {
      const el = ref.current
      if (!el || !cur.current) return null
      const r = el.getBoundingClientRect()
      return Math.max(0, Math.min(1, (innerHeight - r.bottom) / (innerHeight * 0.5))).toFixed(3)
    },
    (p) => {
      if (p !== null) setVar(cur.current, '--p', p)
    },
  )
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

/**
 * ROUND 22 — dwell per slide, in ms. The tick fill animation reads the same
 * number through `--hero-ms`, so the progress line and the timer can never
 * disagree.
 */
const HERO_MS = 5600

/**
 * ROUND 23b — the band takes its shape from the SLIDES, not from a constant.
 *
 * ROUND 27 — but no longer from the SQUAREST one. `Math.min(...)` picked the
 * tallest slide on purpose, because the layer was `object-fit: cover` and any
 * slide taller than the band lost its top and bottom. The layer is `contain`
 * now, so nothing is ever cropped whatever the band's shape — and keeping the
 * old rule actively hurt: one 1600 × 1200 upload alongside a set of 1920 × 700
 * banners dragged the band from 523px to 792px tall (measured at 1440), so the
 * house-format banners floated in a deep letterbox and the fold moved down
 * three quarters of a screen.
 *
 * The mean is the honest answer once cropping is off the table: an all-1920×700
 * set still resolves to exactly 1920/700, a mixed set lands between its
 * members, and whichever slides are squarer than the band simply letterbox on
 * the blurred backdrop instead of being cut. Clamped either side: a portrait
 * upload must not turn the homepage into a poster, and an ultra-wide panorama
 * must not squash the band to a strip the copy can't stand up in. `.hero-card`
 * also keeps a min-height and a max-height (88vh), which win over this.
 */
const HERO_AR_FALLBACK = 1920 / 700
const HERO_AR_MIN = 1.45
const HERO_AR_MAX = 3.4

function heroAspect(
  slides: EdHeroSlide[],
  measured: Record<string, number>,
): number {
  const found = slides
    .map((s) => (s.w && s.h ? s.w / s.h : measured[s.src]))
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0)
  if (found.length === 0) return HERO_AR_FALLBACK
  const mean = found.reduce((a, r) => a + r, 0) / found.length
  return Math.min(HERO_AR_MAX, Math.max(HERO_AR_MIN, mean))
}

/**
 * The homepage hero. Was a single still (`slides[0]`); it now cross-fades
 * through every slide published in admin → Hero, exactly like the classic
 * and brand skins, and keeps the éditorial copy block on top.
 *
 * Performance rules this obeys (see the scroll-perf notes — the éditorial
 * skin's stutters have all been paint-property animations):
 *   · the cross-fade animates OPACITY only, never a filter or a background;
 *   · non-active layers go `visibility: hidden`, so a 12-slide hero still
 *     composites exactly one full-bleed image;
 *   · the ken-burns transform runs on the ACTIVE layer alone and freezes
 *     (never restarts) when the layer hands over, so nothing pops;
 *   · everything — timer and ken-burns — stops while the hero is off screen
 *     or the tab is in the background, like `useAnimGate` does for the bento;
 *   · no scroll listener is added.
 */
export function EdHero({ slides }: { slides: EdHeroSlide[] }) {
  const { t, dir } = useEditorial()
  const shots = slides.length > 0 ? slides : [{ src: '', alt: '' }]
  const many = shots.length > 1
  const rtl = dir === 'rtl' ? -1 : 1
  const card = useRef<HTMLDivElement | null>(null)
  const [i, setI] = useState(0)
  /** Hover or keyboard focus inside the hero — WCAG 2.2.2, hold the timer. */
  const [hover, setHover] = useState(false)
  /** The explicit pause button. */
  const [stopped, setStopped] = useState(false)
  /** On screen AND tab in the foreground. */
  const [awake, setAwake] = useState(true)
  /* Shared media-query hook (ed-scroll.ts), same one `.hist-in` uses. */
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  /* Slides saved before ROUND 23b carry no stored size. Rather than guess a
     ratio for them, measure the decoded image once and fold it in — so his
     existing slider adapts without anything being re-uploaded. Slides that DO
     carry `w`/`h` are correct from the first server-rendered paint, with no
     shift. */
  const [measured, setMeasured] = useState<Record<string, number>>({})
  const note = useCallback((src: string, el: HTMLImageElement) => {
    const r = el.naturalWidth / el.naturalHeight
    if (!Number.isFinite(r) || r <= 0) return
    setMeasured((m) => (m[src] !== undefined ? m : { ...m, [src]: r }))
  }, [])
  const ar = useMemo(() => heroAspect(slides, measured), [slides, measured])

  /* An always-running animation is only free when nobody is looking at it. */
  useEffect(() => {
    const el = card.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let onScreen = true
    const sync = () => setAwake(onScreen && !document.hidden)
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting)
        sync()
      },
      { rootMargin: '10% 0px' },
    )
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  /* The tick fill is a CSS animation, so it would start at FIRST PAINT while
     the autoplay timer only starts at hydration — on a slow first load the
     progress line finished before the slide actually turned. Holding it until
     the timer exists (a direct classList write, so no extra render) keeps the
     two honest; a paused animation resumes from 0, which is exactly right. */
  useEffect(() => {
    card.current?.classList.add('hero-live')
  }, [])

  /* A slide removed in admin must not leave the index dangling — clamped on
     read, so no corrective render is needed. */
  const at = Math.min(i, shots.length - 1)

  const running = many && awake && !hover && !stopped && !reduced
  /* `at` is a dependency on purpose: a manual jump restarts the dwell instead
     of inheriting the few hundred ms left on the previous slide's clock. */
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setI((v) => (v + 1) % shots.length), HERO_MS)
    return () => clearInterval(id)
  }, [running, shots.length, at])

  const go = (n: number) => setI((n + shots.length) % shots.length)

  /* Swipe — touch and pen only; a mouse has the arrows. */
  const from = useRef<number | null>(null)
  const onDown = (e: React.PointerEvent) => {
    from.current = e.pointerType === 'mouse' ? null : e.clientX
  }
  const onUp = (e: React.PointerEvent) => {
    const x0 = from.current
    from.current = null
    if (x0 === null || !many) return
    const d = e.clientX - x0
    if (Math.abs(d) < 44) return
    go(at + (d < 0 ? 1 : -1) * rtl)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!many) return
    if (e.key === 'ArrowRight') go(at + rtl)
    else if (e.key === 'ArrowLeft') go(at - rtl)
    else return
    e.preventDefault()
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const cls = [
    'hero-card',
    many ? 'hero-many' : '',
    running || !many ? '' : 'hero-hold',
    awake && !reduced ? '' : 'hero-sleep',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className="hero" id="accueil" data-band="dark">
      <div
        className={cls}
        ref={card}
        style={{ '--hero-ms': `${HERO_MS}ms`, '--hero-ar': String(ar) } as React.CSSProperties}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setHover(true)}
        onBlurCapture={() => setHover(false)}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onKeyDown={onKey}
        {...(many
          ? { role: 'group', 'aria-roledescription': t('hero.carousel'), 'aria-label': t('hero.carousel') }
          : {})}
      >
        <div className="hero-shots">
          {shots.map((s, n) => (
            <div
              key={`${n}-${s.src}`}
              className={`hero-shot${n === at ? ' on' : ''}`}
              aria-hidden={n === at ? undefined : true}
            >
              {s.src ? (
                <>
                  {/* ROUND 27 — backdrop. The sharp layer below is `contain`
                      now (a composed banner must never be cropped), so
                      wherever the band's real ratio differs from the slide's
                      there are bars. They are filled with a blurred, dimmed
                      copy of the same slide rather than a black void.
                      Requested at ~96px: it is about to be blurred by 38px,
                      so a full-size fetch would buy nothing but bytes. */}
                  <Image
                    src={s.src}
                    alt=""
                    aria-hidden
                    fill
                    sizes="96px"
                    quality={75}
                    priority={n === 0}
                    className="hero-blur"
                  />
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="100vw"
                    quality={82}
                    priority={n === 0}
                    fetchPriority={n === 0 ? 'high' : 'auto'}
                    onLoad={(e) => note(s.src, e.currentTarget)}
                    className="hero-fit"
                  />
                </>
              ) : (
                <Slot label={t('hero.ph')} />
              )}
            </div>
          ))}
        </div>
        {/* ROUND 23 — the two darkening layers (.hero-scrim / .hero-scrim2)
            were removed on request: the 1920×700 banner is shown unmodified. */}
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
        {many && (
          <div className="hero-rail">
            <button
              type="button"
              className="hero-cyc"
              aria-label={stopped ? t('hero.play') : t('hero.pause')}
              aria-pressed={stopped}
              onClick={() => setStopped((v) => !v)}
            >
              {stopped ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
                </svg>
              )}
            </button>
            <div className="hero-ticks">
              {shots.map((_, n) => (
                <button
                  key={n}
                  type="button"
                  className={`hero-tick${n === at ? ' on' : ''}`}
                  onClick={() => go(n)}
                  aria-label={`${t('hero.slide')} ${n + 1}`}
                  aria-current={n === at ? 'true' : undefined}
                />
              ))}
            </div>
            {/* dir=ltr: bidi would otherwise render "01 / 05" as "05 / 01" on /ar */}
            <span className="hero-count" dir="ltr" aria-hidden="true">
              {pad(at + 1)} / {pad(shots.length)}
            </span>
            <div className="hero-arrows">
              <button type="button" onClick={() => go(at - 1)} aria-label={t('aria.prev')}>
                <EIcon n={dir === 'rtl' ? 'chevR' : 'chevL'} s={16} />
              </button>
              <button type="button" onClick={() => go(at + 1)} aria-label={t('aria.next')}>
                <EIcon n={dir === 'rtl' ? 'chevL' : 'chevR'} s={16} />
              </button>
            </div>
          </div>
        )}
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
      {/* ROUND 21c — `data-lenis-prevent-TOUCH`, not the plain attribute.
          The plain one makes Lenis bail out of WHEEL events too: the pointer
          sits over this rail for ~900px of the home page, and there Lenis
          stopped smoothing entirely — the page jumped in raw native steps,
          then Lenis re-synced when the pointer left. That discontinuity is
          exactly the "scroll locks, then continues" Ghani reported.
          Desktop needs no prevention: Lenis runs gestureOrientation
          'vertical' and passes a pure-horizontal wheel straight through, so
          the rail still scrolls sideways. Touch DOES need it (a horizontal
          swipe would otherwise be hijacked) — hence the -touch variant.
          RULE: horizontal rails get -touch; only genuinely VERTICAL nested
          scrollers (.mega-in, .hist-in, .edp-rail) get the plain attribute. */}
      <div className="car" ref={track} onScroll={sync} data-lenis-prevent-touch>
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
  /* ROUND 21 — the logo belt translates forever; park it when off screen. */
  const secRef = useRef<HTMLElement | null>(null)
  useAnimGate(secRef)
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
    <section className="sec" id="marques" ref={secRef} style={{ background: 'var(--wash)' }}>
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
   --p). ROUND 21: the hook itself moved to ed-scroll.ts so the two bands,
   the curtain, the fan and the chrome all share ONE read/write pass. */

export function EdBand({ img, cap, ph, pos = 'tl' }: { img?: string | null; cap: string; ph: string; pos?: 'tl' | 'br' }) {
  /* ROUND 21d — no useScrollP: the band no longer parallaxes. See the
     .band-media note in editorial-design.css. */
  const ref = useRef<HTMLElement | null>(null)
  return (
    <section className="band" data-band="dark" ref={ref}>
      <div className="band-media">
        {img ? <Image src={img} alt="" fill sizes="100vw" loading="eager" fetchPriority="low" style={{ objectFit: 'cover' }} /> : <Slot label={ph} />}
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
  /* ROUND 21d — no useScrollP (static band, see editorial-design.css). */
  const ref = useRef<HTMLElement | null>(null)
  /* ROUND 22 — only below 1080px is .hist-in an actual scroller. See the
     data-lenis-prevent note on it below, and useMedia in ed-scroll.ts. */
  const nested = useMedia('(max-width: 1080px)')
  const refsCount = Math.max(10, Math.floor(data.productCount / 10) * 10)
  const thumbs = data.cats.filter((c) => c.img).slice(0, 6)
  const more = Math.max(0, data.cats.length - thumbs.length)
  /* ROUND 19 — never print a bare "0".
     `brandCount` is 0 whenever getAllBrands() came back empty, which happens
     on a DB blip: queries.ts swallows the error into [] and, because the
     homepage's empty-catalogue guard only checks PRODUCTS, that zero gets
     frozen into the ISR cache for 5 minutes. A counter reading "0 brands"
     next to "390+ references" is worse than no counter at all, so the band
     falls back to the number of brands we are contractually a distributor
     for. */
  const brandCount = data.brandCount > 0 ? data.brandCount : 20
  return (
    <section className="band hist" data-band="dark" ref={ref}>
      <div className="band-media">
        {/* ROUND 21d — eager + low priority. This is a full-bleed photo far
            below the fold; lazy-loading meant it arrived and DECODED right as
            the band scrolled into view — a hitch at exactly the boundary
            Ghani kept reporting. Fetching it early at low priority costs the
            hero nothing and the decode is done long before he gets here. */}
        <Image src="/images/editorial/band-history.webp" alt="" fill sizes="100vw" loading="eager" fetchPriority="low" style={{ objectFit: 'cover' }} />
      </div>
      <span className="hist-scrim" aria-hidden />
      <span className="band-veil" aria-hidden />
      {/* ROUND 22 — the attribute is now CONDITIONAL, and this was the lag.
          `.hist-in` is `position: absolute; inset: 0` — it covers the entire
          78vh band at every width — but it only becomes a nested scroller
          below 1080px. Carrying `data-lenis-prevent` unconditionally meant
          that on a desktop viewport every wheel event aimed anywhere at this
          section made Lenis bail out before preventDefault(), handing the
          scroll back to the browser in raw 120px steps while the rest of the
          page glided at lerp .13 — then snapping back as the pointer left.
          Measured numbers are in the useMedia doc comment in ed-scroll.ts. */}
      <div className="hist-in" {...(nested ? { 'data-lenis-prevent': '' } : {})}>
        <div className="hist-left">
          <div className="hist-mark">D-tech.</div>
          <p className="hist-sub">{t('hist.sub')}</p>
          <div className="hist-stats">
            <div>
              <b>{refsCount}+</b>
              <span>{t('hist.refs')}</span>
            </div>
            <div>
              <b>{brandCount}</b>
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
        {/* ROUND 19 — the story column the band was missing: who D-tech
            actually is, next to the numbers that prove it. */}
        <aside className="hist-right">
          <span className="hist-rule" aria-hidden />
          <h2 className="hist-h">{t('hist.h')}</h2>
          <p>{t('hist.p1')}</p>
          <p>{t('hist.p2')}</p>
          <Link className="hist-cta" href="/company">
            {t('hist.cta')}
            <b aria-hidden>→</b>
          </Link>
        </aside>
      </div>
    </section>
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

/* ROUND 20 — the four bento scenes are 3D objects, not photo plates.
   Ghani asked for a 3D laptop with a coloured backdrop and live content on its
   screen, and an animated 3D delivery truck; the gears and the sealed quote
   are my call for the other two. All CSS — see the block in
   editorial-design.css for the geometry and the cost note. */

/** Key counts per row — real keyboard proportions, widths set in CSS. */
const KB_ROWS = [14, 14, 13, 12, 7]

function LaptopMedia({ t }: { t: (k: string) => string }) {
  return (
    <Tilt>
      <div className="bn-lap" aria-hidden>
        <span className="bn-glow" />
        <span className="bn-floor" />
        <span className="bn-chip">{t('why.bench')}</span>
        <div className="lap">
          <div className="lap-lid">
            <div className="lap-scr">
              <span className="lap-wall" />
              <div className="lap-ui">
                <span className="lap-head">
                  <i />
                  {t('why.lap.head')}
                </span>
                <span className="lap-line" style={{ '--f': '88%' } as React.CSSProperties} />
                <span
                  className="lap-line"
                  style={{ '--f': '64%', '--d': '.5s' } as React.CSSProperties}
                />
                <span
                  className="lap-line"
                  style={{ '--f': '41%', '--d': '1s' } as React.CSSProperties}
                />
                <span className="lap-tags">
                  <span>{t('why.lap.k1')}</span>
                  <span>{t('why.lap.k2')}</span>
                  <span>{t('why.lap.k3')}</span>
                  <span>{t('why.lap.k4')}</span>
                </span>
              </div>
              <span className="lap-vig" />
              <span className="lap-gloss" />
              <span className="lap-cam" />
            </div>
            <span className="lap-hinge" />
          </div>
          <div className="lap-base">
            <span className="lap-kb">
              {KB_ROWS.map((count, r) => (
                <span className={`kbrow r${r}`} key={r}>
                  {Array.from({ length: count }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
              ))}
            </span>
            <span className="lap-pad" />
          </div>
          <span className="lap-chassis" />
        </div>
      </div>
    </Tilt>
  )
}

function SavMedia({ t }: { t: (k: string) => string }) {
  return (
    <Tilt>
      <div className="bn-sav" aria-hidden>
        <span className="sav-glow" />
        {/* Two drawers pulled open on a workshop cabinet — the card's copy is
            "des pièces en stock", so the object should be the stock. */}
        <div className="cabnet">
          <div className="cab-shell">
            <span className="cab-side" />
            <span className="cab-lab">{t('why.sav.parts')}</span>
            <span className="drw" />
            <span className="drw open">
              <span className="drw-top">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="drw open">
              <span className="drw-top">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="drw" />
            <span className="drw" />
            <span className="drw" />
          </div>
        </div>
        <div className="sav-tkt">
          <span className="tkt-head">
            {t('why.sav.ticket')} <b>SAV-2214</b>
          </span>
          <span className="tkt-step">
            <i>
              <EIcon n="check" s={8} sw={3.4} />
            </i>
            {t('why.sav.s1')}
          </span>
          <span className="tkt-step">
            <i>
              <EIcon n="check" s={8} sw={3.4} />
            </i>
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
  return (
    <Tilt>
      <div className="bn-fact" aria-hidden>
        <span className="fact-glow" />
        <div className="fact-stack">
          <span className="fact-sheet s1" />
          <span className="fact-sheet s2" />
          <div className="fact-doc">
            <header>
              <b className="fact-mark">
                D-tech<span>.</span>
              </b>
              <span className="mono">
                {t('why.fact.no')} 2026-0148 · {t('why.fact.date')}
              </span>
            </header>
            {/* Real model names off the catalogue when we have them — an
                invented row on an invoice mock is the one thing a visitor
                who knows the stock would spot. */}
            {(rows.length ? rows : FALLBACK_ROWS).map((r) => (
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
          </div>
          <span className="fact-seal">
            <span className="seal-rib" />
            <span className="seal-disc">
              <span className="seal-ic">{t('why.fact.seal')}</span>
            </span>
          </span>
        </div>
      </div>
    </Tilt>
  )
}

/* Only reached on the About page, which passes no catalogue slice. */
const FALLBACK_ROWS = [
  { name: 'LAPTOP LENOVO LOQ 15', cat: '' },
  { name: 'IMPRIMANTE PHOTOCOPIEUR', cat: '' },
  { name: 'ONDULEUR UNOMAT UPS', cat: '' },
]

function ShipMedia({ t }: { t: (k: string) => string }) {
  return (
    <Tilt max={5}>
      <div className="bn-tk" aria-hidden>
        <span className="tk-sky" />
        <span className="bn-chip">
          {t('why.ship.co')} · {t('why.ship.dest')}
        </span>
        <div className="tk-pins">
          <span>
            {t('why.ship.s1')}
            <i />
          </span>
          <span>
            {t('why.ship.s2')}
            <i />
          </span>
          <span>
            {t('why.ship.s3')}
            <i />
          </span>
        </div>
        <span className="tk-speed">
          <i />
          <i />
          <i />
        </span>
        <span className="tk-road" />
        <div className="truck">
          <div className="bx cargo">
            <span className="f-bk" />
            <span className="f-lf" />
            <span className="f-tp" />
            <span className="f-fr" />
            <span className="cargo-stripe" />
            <span className="cargo-mark">
              D<em>-</em>tech<em>.</em>
            </span>
          </div>
          <div className="bx cab">
            <span className="f-lf" />
            <span className="f-tp" />
            <span className="f-rt" />
            <span className="f-fr" />
            <span className="cab-win" />
            <span className="cab-lamp" />
          </div>
          <span className="whl w1" />
          <span className="whl w2" />
          <span className="whl w3" />
        </div>
      </div>
    </Tilt>
  )
}

export function EdWhy({ bento }: { bento?: EdBento }) {
  const { t } = useEditorial()
  /* ROUND 21 — the four 3D artifacts in here account for ~85 of the home
     page's ~88 infinite CSS animations (60 of them the laptop keycaps,
     animating `background` + `box-shadow`, which repaint). Pause the lot
     while the section is off screen. See ed-scroll.ts. */
  const secRef = useRef<HTMLElement | null>(null)
  useAnimGate(secRef)
  const items = [
    { k: 'bt-a', ic: 'bolt', n: 1, mediaFirst: false },
    { k: 'bt-b', ic: 'wrench', n: 2, mediaFirst: true },
    { k: 'bt-c', ic: 'shield', n: 3, mediaFirst: true },
    { k: 'bt-d', ic: 'truck', n: 4, mediaFirst: true },
  ] as const
  const mediaOf = (n: 1 | 2 | 3 | 4) => {
    if (n === 1) return <LaptopMedia t={t} />
    if (n === 2) return <SavMedia t={t} />
    if (n === 3) return <QuoteMedia rows={bento?.invoice ?? []} t={t} />
    return <ShipMedia t={t} />
  }
  return (
    <section className="sec" id="pourquoi" ref={secRef} style={{ background: 'var(--wash2)' }}>
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
  /* ROUND 19 — the fan now shows D-TECH'S OWN PRODUCTS, not categories.
     This is the one section on the homepage that says "we don't only resell,
     we make things", so it has to hold the house-brand line (PROTAB tablet +
     the DP power-bank family). Categories stay as the fallback: if the
     `dtech` brand is ever renamed or emptied in the admin, the section
     degrades to what it used to be instead of collapsing to nothing. */
  const own = (data.own ?? []).slice(0, 6)
  const useOwn = own.length >= 3
  const cards: { id: string; href: string; img: string | null; kicker: string; title: string }[] =
    useOwn
      ? own.map((p) => ({
          id: p.slug,
          href: `/products/${p.slug}`,
          img: p.img,
          kicker: p.catName,
          title: p.label,
        }))
      : data.cats.slice(0, 6).map((c) => ({
          id: c.id,
          href: `/products?category=${c.id}`,
          img: c.img,
          kicker: `${c.count} ${t('fan.refs')}`,
          title: c.name,
        }))
  const mid = (cards.length - 1) / 2
  const n = cards.length
  /* ROUND 21 — shared read/write pass (ed-scroll.ts), was its own listener. */
  useScrollFx(
    () => {
      const el = fanRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      /* The step is measured, not computed in CSS, and that is deliberate.
         The CSS fallback derives it from a `100%` inside a clamp(); the moment
         that expression is MULTIPLIED inside `translateX`, Chrome drops the
         whole term to zero — the row stayed shut at --p 0.489 with the cards
         4px apart, and nothing about the declaration looks wrong. A measured
         pixel value has no percentage in it, so the transform is plain
         arithmetic. The CSS value still governs the first paint. */
      return {
        p: Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.5))).toFixed(3),
        w: el.clientWidth,
      }
    },
    (v) => {
      const el = fanRef.current
      if (!el || !v) return
      /* ROUND 21d — setVar, not setProperty: `--p` here is an INHERITED
         custom property on `.fan`, whose subtree is every fan card and its
         contents. Writing it unchanged still invalidates that subtree, and
         it IS unchanged on most frames (clamped 0 below, 1 above). */
      setVar(el, '--p', v.p)
      if (v.w > 0) {
        const fw = Math.max(104, Math.min(198, (v.w - (n - 1) * 14) / n))
        setVar(el, '--fw', `${fw.toFixed(2)}px`)
        setVar(el, '--fstep', `${(fw + 14).toFixed(2)}px`)
      }
    },
  )
  return (
    <section className="sec" style={{ background: 'var(--wash2)', overflow: 'hidden' }}>
      <div className="wrap rv">
        <SecHead
          kicker={useOwn ? t('own.eyebrow') : t('fan.eyebrow')}
          title={useOwn ? t('own.title') : t('fan.title')}
          lede={useOwn ? t('own.lede') : t('fan.lede')}
        />
        {/* data-lenis-prevent: below 720px the fan becomes a snapped
            horizontal rail, and Lenis runs with allowNestedScroll:false —
            without this the wheel/touch is swallowed by the page. */}
        <div
          className="fan"
          ref={fanRef}
          data-lenis-prevent-touch
          style={{ ['--n' as string]: String(cards.length) }}
        >
          {cards.map((c, i) => {
            const d = i - mid
            const st = {
              /* Unitless offset from the centre card. The CSS multiplies it by
                 a step derived from the card width, so the row is exact at any
                 count instead of the old hardcoded 78px arc. */
              ['--d' as string]: String(d),
              // Math.round: with an EVEN card count `mid` is a .5, so d is a
              // half-integer and this became `z-index: 8.5` — invalid per
              // spec, so the whole declaration is dropped and the stack's
              // centre-on-top order silently collapses to DOM order.
              zIndex: Math.round(10 - Math.abs(d)),
            } as React.CSSProperties
            return (
              /* [PORT+] a tap goes straight to the product (or, in fallback
                 mode, to the pre-filtered catalogue). */
              <Link className="fcard" key={c.id} style={st} href={c.href}>
                <span className="fi">
                  {c.img ? (
                    <Image src={c.img} alt="" fill sizes="210px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <Slot label={c.title} />
                  )}
                </span>
                <span className="fo"></span>
                <span className="fl">
                  <span className="k">{c.kicker}</span>
                  <h4>{c.title}</h4>
                </span>
              </Link>
            )
          })}
        </div>
        <div className="fan-foot">
          {useOwn ? (
            <Link href="/products?brand=dtech" style={{ fontWeight: 600 }}>
              {t('own.foot')}
            </Link>
          ) : (
            <Link href="/products" style={{ fontWeight: 600 }}>
              {t('fan.foot')}
            </Link>
          )}
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
