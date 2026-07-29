'use client'

/**
 * ROUND 19 (phase C) — /company.
 *
 * The corporate profile, in the shape of the ASBIS page Ghani pointed at
 * (stats band → story → values → brands → clients) but written from the
 * company deck he sent and from the CACI registry entry — see the
 * dtech-company-facts memory. Every figure on this page is either verified
 * or derived live from the catalogue; nothing is invented.
 *
 * ⚠️ Two accuracy rules, please keep them:
 *  1. D-tech is the BRAND, SARL Hardware Technology Service ("Hartech") is
 *     the company. 2006 is the company; the "depuis 2014" on the homepage is
 *     the D-tech brand. Both are true, don't reconcile one into the other.
 *  2. Only DELL, ASUS and TP-LINK are official distributions, and only
 *     TP-LINK and AOC are exclusive. Everything else is "carried".
 *
 * Client names are rendered as TEXT, not logos: the marks belong to Mobilis,
 * Djezzy, Algérie Télécom and the rest, and inventing or AI-generating them
 * would be a trademark problem. Drop real files in `public/images/clients/`
 * and swap `.edcy-client` to an <Image> when you have permission.
 */

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { EIcon } from './editorial-icons'
import { BrandMarkArt, getBrandMark } from '@/components/home/brand-marks'
import { ED_BRAND_FACTS, type EdBrandStatus } from './ed-brand-facts'
import { ED_FAMILIES } from './ed-families'
import type { BrandProduct } from '@/components/brand/brand-types'

export interface EdCompanyData {
  /** Whole years since 2006, computed on the server so it can't drift on hydrate. */
  years: number
  productCount: number
  brandCount: number
  categoryCount: number
  /** The two house brands, with their real reference counts. */
  ownBrands: { slug: string; name: string; count: number }[]
  /** A few house-brand products to show, not just name. */
  ownProducts: BrandProduct[]
  /** Every distributed brand, for the wall. */
  brands: { slug: string; name: string; count: number }[]
}

/** Verified from the CACI registry entry — see dtech-company-facts. */
const FOUNDED = 2006
const FOUNDER = 'Faycal BOUNAR'
const LEGAL = 'SARL Hardware Technology Service'

/** From the company profile deck. Rendered as names, never as fake logos. */
const CLIENTS = [
  'Mobilis',
  'Djezzy',
  'Algérie Télécom',
  'Crédit Populaire d’Algérie',
  'OPGI',
  'Bab Ezzouar Centre Commercial',
]

/** Fallback display names, so a claim survives the brand leaving the catalogue. */
const BRAND_LABEL: Record<string, string> = {
  'tp-link': 'TP-Link',
  aoc: 'AOC',
  dell: 'Dell',
  asus: 'ASUS',
}

const VALUES = ['quality', 'price', 'trust', 'service'] as const
const MILESTONES = ['m1', 'm2', 'm3', 'm4'] as const

export function EdCompanyPage({ data }: { data: EdCompanyData }) {
  const { t, tf } = useEditorial()

  /**
   * Distribution claims come from ED_BRAND_FACTS (the registry-backed source),
   * NOT from what happens to be in stock.
   *
   * Deriving them from `data.brands` tied a contractual statement to live
   * inventory: AOC has exactly one reference, so archiving that single SKU
   * would have silently dropped "et AOC" from the exclusive line while the
   * milestone paragraph two sections above still named it — the page
   * contradicting itself, with nobody notified.
   */
  const named = (s: EdBrandStatus) =>
    Object.entries(ED_BRAND_FACTS)
      .filter(([, f]) => f.status === s)
      .map(([slug]) => data.brands.find((b) => b.slug === slug)?.name ?? BRAND_LABEL[slug] ?? slug)

  const exclusive = named('exclusive')
  const official = named('official')

  return (
    <div className="edcy">
      {/* ── Hero ── */}
      <header className="edcy-hero">
        <span className="edcy-wash" aria-hidden />
        <div className="wrap edcy-heroin">
          <span className="eyebrow">{t('co.eyebrow')}</span>
          <h1 className="edcy-h1">
            D-tech<span>.</span>
          </h1>
          {/* tf, not t — `co.sub` carries a {legal} placeholder and `t` does
              no substitution, so this printed "La marque de {legal}." */}
          <p className="edcy-sub">{tf('co.sub', { legal: LEGAL })}</p>
          <p className="lede">{tf('co.lede', { years: data.years, legal: LEGAL })}</p>

          <dl className="edcy-facts">
            <div>
              <dt>{t('co.f1')}</dt>
              <dd>{FOUNDED}</dd>
            </div>
            <div>
              <dt>{t('co.f2')}</dt>
              <dd>{FOUNDER}</dd>
            </div>
            <div>
              <dt>{t('co.f3')}</dt>
              <dd>Bab Ezzouar, Alger</dd>
            </div>
            <div>
              <dt>{t('co.f4')}</dt>
              <dd>{LEGAL}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ── Key figures ── */}
      <section className="edcy-nums">
        <div className="wrap edcy-numgrid rv">
          {[
            { v: `${data.years}`, l: t('co.n1') },
            { v: `${data.productCount}+`, l: t('co.n2') },
            { v: `${data.brandCount}`, l: t('co.n3') },
            { v: `${data.categoryCount}`, l: t('co.n4') },
            { v: '58', l: t('co.n5') },
            { v: '2', l: t('co.n6') },
          ].map((s, i) => (
            <div className="stag" key={s.l} style={{ ['--i' as string]: String(i) }}>
              <b>{s.v}</b>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who we are ── */}
      <section className="sec edcy-story">
        <div className="wrap edcy-storygrid">
          <div className="rv">
            <span className="eyebrow">{t('co.who')}</span>
            <h2 className="h2">{t('co.whoTitle')}</h2>
          </div>
          <div className="edcy-prose rv">
            <p>{tf('co.p1', { legal: LEGAL, founder: FOUNDER, year: FOUNDED })}</p>
            <p>{tf('co.p2', { years: data.years })}</p>
            <p>{t('co.p3')}</p>
          </div>
        </div>
      </section>

      {/* ── Milestones ── */}
      <section className="sec edcy-time">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <span className="eyebrow">{t('co.path')}</span>
            <h2 className="h2">{t('co.pathTitle')}</h2>
          </div>
          <ol className="edcy-timeline rv">
            {MILESTONES.map((m, i) => (
              <li key={m} className="stag" style={{ ['--i' as string]: String(i) }}>
                <span className="edcy-dot" aria-hidden />
                <b>{t(`co.${m}.y`)}</b>
                <h3>{t(`co.${m}.t`)}</h3>
                <p>{t(`co.${m}.d`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Our own brands — the ask: talk about D-tech's OWN products ── */}
      <section className="sec edcy-own">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <div>
              <span className="eyebrow">{t('co.own')}</span>
              <h2 className="h2">{t('co.ownTitle')}</h2>
            </div>
            <p className="lede">{t('co.ownLede')}</p>
          </div>

          <div className="edcy-ownbrands rv">
            {data.ownBrands.map((b) => {
              const m = getBrandMark(b.slug, b.name)
              return (
                <Link
                  className="edcy-ownbrand"
                  key={b.slug}
                  href={`/brands/${b.slug}`}
                  style={{ ['--bc' as string]: m.tile, ['--bfg' as string]: m.fg }}
                >
                  <span className="edcy-ownmark">
                    <BrandMarkArt slug={b.slug} name={b.name} h={34} maxW={120} />
                  </span>
                  <span className="edcy-ownmeta">
                    <b>{b.name}</b>
                    <i>{t(`co.own.${b.slug}`)}</i>
                    <em>
                      {b.count} {t('bi.refs')}
                    </em>
                  </span>
                </Link>
              )
            })}
          </div>

          {data.ownProducts.length > 0 ? (
            <div className="ed-prod-grid rv" style={{ marginTop: 22 }}>
              {data.ownProducts.map((p) => (
                <article className="ed-card" key={p.slug}>
                  <Link className="ed-card-imgbox" href={`/products/${p.slug}`} tabIndex={-1} aria-hidden>
                    {p.img ? (
                      <Image
                        src={p.img}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 90vw, 300px"
                        style={{ objectFit: 'contain' }}
                      />
                    ) : null}
                  </Link>
                  <div className="ed-card-body">
                    <span className="ed-card-kicker">
                      {p.brand} · {p.catName}
                    </span>
                    <Link className="ed-card-name" href={`/products/${p.slug}`}>
                      {p.name}
                    </Link>
                    <p className="ed-card-spec">{p.spec}</p>
                    <div className="ed-card-foot">
                      <Link className="ed-card-cta" href={`/products/${p.slug}`}>
                        {t('card.view')}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Professional ranges ── */}
      <section className="sec edcy-ranges">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <div>
              <span className="eyebrow">{t('co.ranges')}</span>
              <h2 className="h2">{t('co.rangesTitle')}</h2>
            </div>
            <p className="lede">{t('co.rangesLede')}</p>
          </div>
          <div className="edcy-rangegrid rv">
            {ED_FAMILIES.map((f, i) => (
              <Link
                className="edcy-range stag"
                key={f.id}
                href="/catalogue"
                style={{ ['--i' as string]: String(i), ['--h' as string]: String(f.hue) }}
              >
                <b>{t(`fam.${f.id}`)}</b>
                <span>{t(`fam.${f.id}.d`)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Distribution brands ── */}
      <section className="sec edcy-brands">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <div>
              <span className="eyebrow">{t('co.dist')}</span>
              <h2 className="h2">{t('co.distTitle')}</h2>
            </div>
            <p className="lede">{t('co.distLede')}</p>
          </div>

          {exclusive.length > 0 || official.length > 0 ? (
            <div className="edcy-claims rv">
              {exclusive.length > 0 ? (
                <p className="edcy-claim">
                  <EIcon n="check" s={15} sw={2.6} />
                  <span>
                    <b>{t('bstat.exclusive')}</b>
                    {exclusive.join(' · ')}
                  </span>
                </p>
              ) : null}
              {official.length > 0 ? (
                <p className="edcy-claim">
                  <EIcon n="check" s={15} sw={2.6} />
                  <span>
                    <b>{t('bstat.official')}</b>
                    {official.join(' · ')}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="edcy-wall rv">
            {data.brands.map((b, i) => {
              const m = getBrandMark(b.slug, b.name)
              return (
                <Link
                  className="edcy-tile stag"
                  key={b.slug}
                  href={`/brands/${b.slug}`}
                  title={b.name}
                  style={{
                    ['--i' as string]: String(i % 8),
                    ['--bc' as string]: m.tile,
                    ['--bfg' as string]: m.fg,
                  }}
                >
                  <BrandMarkArt slug={b.slug} name={b.name} h={28} maxW={100} />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Objectives / values ── */}
      <section className="sec edcy-values">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <div>
              <span className="eyebrow">{t('co.val')}</span>
              <h2 className="h2">{t('co.valTitle')}</h2>
            </div>
          </div>
          <div className="edcy-valgrid rv">
            {VALUES.map((v, i) => (
              <article key={v} className="stag" style={{ ['--i' as string]: String(i) }}>
                <span className="edcy-valn">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t(`co.v.${v}`)}</h3>
                <p>{t(`co.v.${v}.d`)}</p>
              </article>
            ))}
          </div>
          <blockquote className="edcy-quote rv">
            {t('co.quote')}
            <cite>{t('co.quoteBy')}</cite>
          </blockquote>
        </div>
      </section>

      {/* ── They trusted us ── */}
      <section className="sec edcy-clients">
        <div className="wrap">
          <div className="edcy-sechead rv">
            <div>
              <span className="eyebrow">{t('co.trust')}</span>
              <h2 className="h2">{t('co.trustTitle')}</h2>
            </div>
            <p className="lede">{t('co.trustLede')}</p>
          </div>
          <div className="edcy-clientrow rv">
            {CLIENTS.map((c, i) => (
              <span className="edcy-client stag" key={c} style={{ ['--i' as string]: String(i) }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="edcy-cta">
        <div className="wrap edcy-ctain">
          <div>
            <h2>{t('co.ctaTitle')}</h2>
            <p>{t('co.ctaLede')}</p>
          </div>
          <div className="edcy-ctabtns">
            <Link className="btn btn-k" href="/contact">
              {t('co.ctaBtn')}
            </Link>
            <Link className="btn btn-g" href="/catalogue">
              {t('cpage.all')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
