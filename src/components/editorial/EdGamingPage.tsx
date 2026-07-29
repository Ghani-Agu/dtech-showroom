'use client'

/**
 * ROUND 19 G — /gaming, "violet / verre".
 *
 * Fourth pass, and the first one Ghani chose himself: after three rejected
 * designs he picked this direction from four side-by-side options. The
 * rejected ones are worth naming so nobody rebuilds them — hover-only RGB
 * (no lights at rest), ambient RGB around a CSS-DRAWN PC CASE (read as
 * fake — never draw hardware on a site that sells the real thing), and a
 * lime/angular esports look (rejected outright).
 *
 * The system: deep violet-black ground, animated halos, frosted glass,
 * ONE violet→cyan gradient for every accent, generous radii, and real
 * product photography sitting on a soft light pool.
 *
 * Client component only for the tab state. Everything else is server data
 * + CSS; no scroll listener, no rAF. See the CSS block for the
 * backdrop-filter budget, which matters on mid-range Android.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { EIcon } from './editorial-icons'
import { BrandMarkArt } from '@/components/home/brand-marks'
import { WA } from './EditorialChrome'
import type { EdGamingData } from '@/server/gaming-data'

/** Four reasons to buy the rig here rather than from an import page. */
const VALUES = [
  { k: 'w1', ic: 'build' },
  { k: 'w2', ic: 'shield' },
  { k: 'w3', ic: 'wrench' },
  { k: 'w4', ic: 'truck' },
] as const

export function EdGamingPage({ data }: { data: EdGamingData }) {
  const { t, tf } = useEditorial()
  const [col, setCol] = useState(data.collections[0]?.id ?? 'build')
  /* ROUND 20c — the hero used to front ONE product. It now cycles the whole
     showcase and lets you pick, because a gaming landing page that shows a
     single monitor is arguing that we stock a single monitor. */
  const [hi, setHi] = useState(0)
  const [held, setHeld] = useState(false)
  const active = data.collections.find((c) => c.id === col) ?? data.collections[0]

  /** Featured gaming products with artwork — the hero rotates through them. */
  const heroes = data.showcase.slice(0, 5)
  const hero = heroes[hi] ?? heroes[0] ?? null

  /* Auto-advance, paused while the visitor is hovering or keyboard-focused
     inside the panel, and off entirely for reduced-motion. */
  useEffect(() => {
    if (heroes.length < 2 || held) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setHi((i) => (i + 1) % heroes.length), 4200)
    return () => clearInterval(id)
  }, [heroes.length, held])

  /** ARIA APG tabs keyboard model: arrows move, Home/End jump, focus follows. */
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = data.collections.length
    if (n < 2) return
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % n
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    const target = data.collections[next]
    if (!target) return
    setCol(target.id)
    document.getElementById(`edg-tab-${target.id}`)?.focus()
  }

  return (
    <div className="edg">
      {/* Ambient halos — four blurred blobs on long offset periods, so the
          light never visibly loops. They sit behind everything. */}
      <span className="edg-aur" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>

      {/* ── Hero ── */}
      <header className="edg-hero" data-band="dark">
        {/* Perspective grid floor: reads as "gaming" without DRAWING hardware.
            Round 19 rejected a CSS-built PC case for exactly that reason —
            never illustrate the thing you actually sell. */}
        <span className="edg-floor" aria-hidden>
          <i />
        </span>
        <div className="wrap edg-heroin">
          <div className="edg-herotext">
            <span className="edg-pill">
              <em />
              {t('gm.eyebrow')} · Alger
            </span>
            <h1 className="edg-h1">
              {t('gm.t1')}{' '}
              <span className="edg-grad">
                {t('gm.t2')} {t('gm.t3')}
              </span>
            </h1>
            <p className="edg-hsub">{t('gm.lede')}</p>
            <div className="edg-hbtns">
              <a className="edg-btn" href="#config">
                {t('gm.cta1')}
                <EIcon n="chevR" s={14} sw={2.6} />
              </a>
              <a className="edg-btn o" href={WA} target="_blank" rel="noopener noreferrer">
                {t('gm.cta2')}
              </a>
            </div>
            <div className="edg-stats">
              <div className="edg-stat">
                <b>{data.total}</b>
                <i>{t('gm.s1')}</i>
              </div>
              <div className="edg-stat">
                <b>{data.brands.length}</b>
                <i>{t('gm.s2')}</i>
              </div>
              <div className="edg-stat">
                <b>{data.steps.length}</b>
                <i>{t('gm.s3')}</i>
              </div>
              <div className="edg-stat">
                <b>58</b>
                <i>{t('bp.st3')}</i>
              </div>
            </div>
          </div>

          {/* A real product photo on a glass panel — NOT a CSS drawing. */}
          {hero ? (
            <div
              className="edg-hpanel"
              onPointerEnter={() => setHeld(true)}
              onPointerLeave={() => setHeld(false)}
              onFocusCapture={() => setHeld(true)}
              onBlurCapture={() => setHeld(false)}
            >
              <span className="edg-pill edg-hchip">{t('gm.stock')}</span>
              <span className="edg-pool" aria-hidden />
              <span className="edg-hstage">
                {/* Every slide stays mounted and crossfades. Swapping the src
                    on one <Image> would flash the placeholder on each change
                    and re-request art the visitor already downloaded. */}
                {heroes.map((h, i) => (
                  <span className={`edg-hshot${i === hi ? ' on' : ''}`} key={h.slug}>
                    {h.img ? (
                      <Image
                        src={h.img}
                        alt={h.name}
                        fill
                        sizes="(max-width: 940px) 88vw, 460px"
                        style={{ objectFit: 'contain' }}
                        priority={i === 0}
                      />
                    ) : null}
                  </span>
                ))}
              </span>
              <span className="edg-hname" aria-live="polite">
                <i>{hero.brand}</i>
                <b>{hero.name}</b>
              </span>
              {heroes.length > 1 ? (
                <span className="edg-hpicks" role="tablist" aria-label={t('gm.pick')}>
                  {heroes.map((h, i) => (
                    <button
                      type="button"
                      role="tab"
                      key={h.slug}
                      className={`edg-hpick${i === hi ? ' on' : ''}`}
                      aria-selected={i === hi}
                      aria-label={h.name}
                      onClick={() => setHi(i)}
                    >
                      {h.img ? (
                        <Image src={h.img} alt="" fill sizes="56px" style={{ objectFit: 'contain' }} />
                      ) : null}
                      <em aria-hidden />
                    </button>
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {/* The one full-width RGB element on the page. See the CSS note on the
          RGB budget before adding a second. */}
      <div className="wrap">
        <span className="edg-rgbbar" aria-hidden />
      </div>

      {/* ── Brand ticker ── */}
      {data.brands.length > 0 ? (
        <section className="edg-sec" data-band="dark" style={{ paddingTop: 4, paddingBottom: 8 }}>
          <div className="wrap">
            <div className="edg-marq">
              {/* Duplicated once so the -50% translate loops seamlessly. */}
              <div className="edg-marqrow">
                {[...data.brands, ...data.brands].map((b, i) => (
                  <Link className="edg-bchip" key={`${b.slug}-${i}`} href={`/brands/${b.slug}`}>
                    <span className="edg-bmark">
                      <BrandMarkArt slug={b.slug} name={b.name} h={22} maxW={96} />
                    </span>
                    <i>{b.count}</i>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Build path ── */}
      {data.steps.length > 0 ? (
        <section className="edg-sec" id="config" data-band="dark">
          <div className="wrap">
            <div className="edg-shead rv">
              <div>
                <span className="edg-pill">{t('gm.build')}</span>
                <h2>{t('gm.buildTitle')}</h2>
              </div>
              <p>{t('gm.buildLede')}</p>
            </div>
            <span className="edg-spine rv" aria-hidden />
            <ol className="edg-ladder rv">
              {data.steps.map((s, i) => (
                <li key={s.slug} className="stag" style={{ ['--i' as string]: String(i) }}>
                  <Link
                    href={{ pathname: '/products', query: { category: s.slug } }}
                    className="edg-rung rgbring"
                  >
                    <span className="edg-rungshot">
                      <span className="edg-rungn">{String(i + 1).padStart(2, '0')}</span>
                      {s.img ? (
                        <Image
                          src={s.img}
                          alt=""
                          fill
                          sizes="(max-width: 760px) 46vw, 280px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : null}
                    </span>
                    <span className="edg-rungbody">
                      <div>
                        <b>{t(`gm.step.${s.slug}`)}</b>
                        <i>
                          {s.count} {t('bi.refs')}
                        </i>
                      </div>
                      <span aria-hidden>→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ── The three gaming catalogues ── */}
      {active ? (
        <section className="edg-sec" data-band="dark">
          <div className="wrap">
            <div className="edg-shead rv">
              <div>
                <span className="edg-pill">{t('gm.cat')}</span>
                <h2>{t('gm.catTitle')}</h2>
              </div>
              <p>{t('gm.catLede')}</p>
            </div>

            <div className="edg-tabs rv" role="tablist" aria-label={t('gm.cat')}>
              {data.collections.map((c, i) => (
                <button
                  key={c.id}
                  role="tab"
                  type="button"
                  id={`edg-tab-${c.id}`}
                  aria-selected={c.id === col}
                  aria-controls={`edg-panel-${c.id}`}
                  tabIndex={c.id === col ? 0 : -1}
                  className={c.id === col ? 'on' : undefined}
                  onClick={() => setCol(c.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {t(`gm.col.${c.id}`)}
                  <em>{c.products.length}</em>
                </button>
              ))}
            </div>

            <p className="edg-colnote rv">{t(`gm.col.${active.id}.d`)}</p>

            {/* Every panel renders; inactive ones are `hidden`, so the
                aria-controls on each tab always points at a real node. */}
            {data.collections.map((c) => (
              <div
                key={c.id}
                className="edg-grid2 rv"
                role="tabpanel"
                id={`edg-panel-${c.id}`}
                aria-labelledby={`edg-tab-${c.id}`}
                hidden={c.id !== col}
              >
                {c.products.map((p, i) => (
                  <Link
                    className="edg-card rgbring stag"
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    style={{ ['--i' as string]: String(i % 8) }}
                  >
                    <span className="edg-stage">
                      <span className={`edg-ctag${p.featured ? ' hot' : ''}`}>
                        {p.featured ? t('gm.top') : p.catName}
                      </span>
                      {p.img ? (
                        <Image
                          src={p.img}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 46vw, 264px"
                          style={{ objectFit: 'contain' }}
                        />
                      ) : null}
                    </span>
                    <span className="edg-cardbody">
                      <i>
                        {p.brand} · {p.catName}
                      </i>
                      <b>{p.name}</b>
                      <span className="edg-cfoot">
                        <span>{t('gm.stock')}</span>
                        <em>{t('gm.see')} →</em>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}

            <div className="edg-all rv">
              <Link
                className="edg-btn"
                href={{ pathname: '/products', query: { category: 'gaming' } }}
              >
                {tf('gm.all', { count: data.gearCount })}
                <EIcon n="chevR" s={14} sw={2.6} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Why here ── */}
      <section className="edg-sec" data-band="dark">
        <div className="wrap">
          <span className="edg-rule rv" />
          <div className="edg-shead rv" style={{ marginTop: 26 }}>
            <div>
              <span className="edg-pill">{t('gm.why')}</span>
              <h2>{t('gm.whyTitle')}</h2>
            </div>
            <p>{t('gm.whyLede')}</p>
          </div>
          <div className="edg-vals rv">
            {VALUES.map((v, i) => (
              <article className="edg-val stag" key={v.k} style={{ ['--i' as string]: String(i) }}>
                <span className="edg-valn">{String(i + 1).padStart(2, '0')}</span>
                <span className="edg-valic">
                  <EIcon n={v.ic} s={20} sw={1.9} />
                </span>
                <b>{t(`gm.${v.k}.t`)}</b>
                <p>{t(`gm.${v.k}.p`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="edg-cta" data-band="dark">
        <div className="wrap">
          <div className="edg-ctain rgbring always">
            <div>
              <h2>{t('gm.ctaTitle')}</h2>
              <p>{t('gm.ctaLede')}</p>
            </div>
            <div className="edg-ctabtns">
              <Link className="edg-btn" href="/contact">
                {t('gm.ctaBtn')}
              </Link>
              <a className="edg-btn o" href={WA} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
