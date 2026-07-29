'use client'

/**
 * ROUND 19 — /brands/[slug], the real brand page.
 *
 * Structure follows the reference Ghani pointed at (d-techalgerie.com/hp):
 * hero → why this brand → what we carry → selection → figures → FAQ → CTA.
 * Everything is driven by the DB row + the real catalogue, and everything
 * language-dependent comes from ONE set of `{brand}`-interpolated strings —
 * see the header of `ed-brand-facts.ts` for why the per-brand data is kept
 * to proper nouns and enum keys.
 *
 * The whole page is server-data + CSS. The only interactive parts are native
 * `<details>` accordions, so there is no hydration cost beyond the shared
 * chrome and nothing shifts after paint.
 */

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { EdRail } from './EdRail'
import { EIcon } from './editorial-icons'
import { brandFacts } from './ed-brand-facts'
import { getBrandMark, BrandMarkArt } from '@/components/home/brand-marks'
import { ED_PHONE_TEL, WA } from './EditorialChrome'
import type { BrandProduct } from '@/components/brand/brand-types'

export interface EdBrandPageData {
  slug: string
  name: string
  /** DB `statement` — the one-line positioning. */
  statement: string
  /** DB `description` — the paragraph. */
  description: string
  heroImage: string | null
  productCount: number
  /** Categories this brand actually has products in. */
  cats: { slug: string; name: string; count: number; img: string | null }[]
  /** A representative slice of the brand's catalogue. */
  products: BrandProduct[]
  /** Sibling brands for the footer rail. */
  others: { slug: string; name: string; count: number }[]
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="edb-faq">
      <summary>
        <span>{q}</span>
        <i aria-hidden />
      </summary>
      <p>{a}</p>
    </details>
  )
}

export function EdBrandPage({ data }: { data: EdBrandPageData }) {
  const { t, tf } = useEditorial()
  const facts = brandFacts(data.slug)
  const mark = getBrandMark(data.slug, data.name)
  const status = t(`bstat.${facts.status}`)
  const B = data.name

  /* The brand's own colour drives the whole page: hero wash, rules, the CTA
     band and every hover accent. One inline custom property, read by ~20 CSS
     rules — that is what makes 21 pages feel individual without 21 designs. */
  const accent = { ['--bc' as string]: mark.tile, ['--bfg' as string]: mark.fg }

  return (
    <div className="edb" style={accent} data-status={facts.status}>
      {/* ── Hero: a full-bleed band in the brand's own colour ── */}
      <header className="edb-hero">
        <div className="wrap">
          <nav className="edb-crumb" aria-label="Breadcrumb">
            <Link href="/brands">{t('bp.crumbTop')}</Link>
            <i aria-hidden>/</i>
            <span>{B}</span>
          </nav>
        </div>
        <div className="wrap edb-heroin">
            <div className="edb-herotext">
              <span className="edb-badge">
                <EIcon n="check" s={13} sw={2.4} />
                {tf('bp.badge', { status })}
              </span>
              <h1 className="edb-h1">{tf('bp.h1', { brand: B })}</h1>
              {data.statement ? <p className="edb-statement">{data.statement}</p> : null}
              <p className="lede">{tf('bp.lede', { brand: B, count: data.productCount })}</p>

              {facts.lines.length > 0 ? (
                <div className="edb-lines">
                  <span className="micro">{t('bp.lines')}</span>
                  <div>
                    {facts.lines.map((l) => (
                      <b key={l}>{l}</b>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="edb-ctas">
                <Link
                  className="btn btn-w"
                  href={{ pathname: '/products', query: { brand: data.slug } }}
                >
                  {tf('bp.cta1', { count: data.productCount })}
                </Link>
                <a className="btn btn-g" href={`tel:${ED_PHONE_TEL}`}>
                  <EIcon n="tel" s={16} />
                  {t('bp.cta2')}
                </a>
              </div>
            </div>

            {/* When a brand hero image exists it IS the better hero, and the
                mark drops to a badge on it; otherwise the mark carries the
                card on its own. */}
            <div className="edb-heromark">
              {data.heroImage ? (
                <span className="edb-heroimg">
                  <Image
                    src={data.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 90vw, 460px"
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                  <span className="edb-imgmark" aria-hidden>
                    <BrandMarkArt slug={data.slug} name={data.name} h={18} maxW={70} />
                  </span>
                </span>
              ) : (
                <span className="edb-tile">
                  <BrandMarkArt slug={data.slug} name={data.name} h={62} maxW={190} />
                </span>
              )}
              {facts.since ? (
                <span className="edb-since">{tf('bp.since', { y: facts.since })}</span>
              ) : null}
            </div>
        </div>
      </header>

      {/* ── Figures, riding the seam under the band ── */}
      <div className="edb-statband">
        <div className="wrap edb-statgrid">
          <div>
            <b>{data.productCount}</b>
            <span>{tf('bp.st1', { brand: B })}</span>
          </div>
          <div>
            <b>{data.cats.length}</b>
            <span>{t('bp.st2')}</span>
          </div>
          <div>
            <b>58</b>
            <span>{t('bp.st3')}</span>
          </div>
          <div>
            <b className="edb-statword">{t('bp.st4')}</b>
            <span>{t('bp.st4d')}</span>
          </div>
        </div>
      </div>

      {/* ── Description + why ── */}
      <section className="sec edb-why">
        <div className="wrap">
          {data.description ? (
            <p className="edb-desc rv">{data.description}</p>
          ) : null}
          <div className="edb-sechead rv">
            <div>
              <span className="eyebrow">{tf('bp.why', { brand: B })}</span>
              <h2 className="h2">{t('bp.whyTitle')}</h2>
            </div>
            <p className="lede">{tf('bp.whyLede', { brand: B })}</p>
          </div>
          <div className="edb-cards rv">
            {facts.strengths.map((k, i) => (
              <article className="edb-card stag" key={k} style={{ ['--i' as string]: String(i) }}>
                <span className="edb-cardn">{String(i + 1).padStart(2, '0')}</span>
                <span className="edb-cardic">
                  <EIcon n={STRENGTH_ICON[k] ?? 'check'} s={19} />
                </span>
                <h3>{t(`bstr.${k}`)}</h3>
                <p>{t(`bstr.${k}.d`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories we carry from this brand ── */}
      {data.cats.length > 0 ? (
        <section className="sec edb-cats">
          <div className="wrap">
            <div className="edb-sechead rv">
              <div>
                <span className="eyebrow">{t('bp.cats')}</span>
                <h2 className="h2">{tf('bp.catsTitle', { brand: B })}</h2>
              </div>
              <p className="lede">{tf('bp.catsLede', { brand: B })}</p>
            </div>
            <div className="edb-catgrid rv">
              {data.cats.map((c, i) => (
                <Link
                  className="edb-cat stag"
                  key={c.slug}
                  style={{ ['--i' as string]: String(i) }}
                  href={{ pathname: '/products', query: { brand: data.slug, category: c.slug } }}
                >
                  <span className="edb-catimg">
                    {c.img ? (
                      <Image
                        src={c.img}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 100vw, 260px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : null}
                  </span>
                  <span className="edb-catglow" aria-hidden />
                  <span className="edb-catbody">
                    <i>
                      {c.count} {t('bi.refs')}
                    </i>
                    <b>{c.name}</b>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── A slice of the actual catalogue ── */}
      {data.products.length > 0 ? (
        <section className="sec edb-sel">
          <div className="wrap">
            <div className="edb-sechead rv">
              <div>
                <span className="eyebrow">{t('bp.prods')}</span>
                <h2 className="h2">{tf('bp.prodsTitle', { brand: B })}</h2>
              </div>
              <Link
                className="edb-all"
                href={{ pathname: '/products', query: { brand: data.slug } }}
              >
                {tf('bp.prodsAll', { brand: B, count: data.productCount })}
              </Link>
            </div>
            {/* A snapping horizontal rail, not a second grid: this section
                is a teaser for /products, and a grid competes with it.
                ROUND 20 — moved into EdRail. It was a bare `overflow-x: auto`,
                so on a mouse the sixth card sat half-cut at the edge with no
                affordance and no way to reach it short of shift+wheel. */}
            <EdRail
              className="edb-rail rv"
              label={t('bp.prods')}
              prevLabel={t('rail.prev')}
              nextLabel={t('rail.next')}
            >
              {data.products.map((p) => (
                <Link className="edb-prod" key={p.slug} href={`/products/${p.slug}`}>
                  <span className="edb-prodimg">
                    {p.img ? (
                      <Image src={p.img} alt="" fill sizes="236px" style={{ objectFit: 'contain' }} />
                    ) : null}
                  </span>
                  <span className="edb-prodbody">
                    <i>{p.catName}</i>
                    <b>{p.name}</b>
                  </span>
                </Link>
              ))}
            </EdRail>
          </div>
        </section>
      ) : null}

      {/* ── FAQ ── */}
      <section className="sec edb-faqs">
        <div className="wrap">
          <div className="edb-sechead rv">
            <div>
              <span className="eyebrow">{t('bp.faq')}</span>
              <h2 className="h2">{tf('bp.faqTitle', { brand: B })}</h2>
            </div>
            <p className="lede">{t('bp.faqLede')}</p>
          </div>
          <div className="edb-faqlist rv">
            {([1, 2, 3, 4] as const).map((n) => (
              <Faq
                key={n}
                q={tf(`bp.q${n}`, { brand: B })}
                a={tf(`bp.a${n}`, { brand: B })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA in the brand's colour ── */}
      <section className="edb-cta">
        <div className="wrap edb-ctain">
          <div>
            <h2>{tf('bp.ctaTitle', { brand: B })}</h2>
            <p>{t('bp.ctaLede')}</p>
          </div>
          <div className="edb-ctabtns">
            <Link className="btn edb-ctabtn" href="/contact">
              {t('bp.ctaBtn')}
            </Link>
            <a className="btn btn-wa" href={WA} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Sibling brands ── */}
      {data.others.length > 0 ? (
        <section className="sec edb-others">
          <div className="wrap">
            <span className="eyebrow">{t('bp.other')}</span>
            {/* data-lenis-prevent: bare overflow-x:auto rail — Lenis runs
                with allowNestedScroll:false and would otherwise eat the
                wheel/trackpad gesture and scroll the page instead. */}
            <div className="edb-otherrail" data-lenis-prevent-touch>
              {data.others.map((o) => {
                const m = getBrandMark(o.slug, o.name)
                return (
                  <Link
                    className="edb-other"
                    key={o.slug}
                    href={`/brands/${o.slug}`}
                    style={{ ['--bc' as string]: m.tile, ['--bfg' as string]: m.fg }}
                  >
                    <span className="edb-othermark">
                      <BrandMarkArt slug={o.slug} name={o.name} h={26} maxW={92} />
                    </span>
                    <i>
                      {o.count} {t('bi.refs')}
                    </i>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** Strength key → EDPATH glyph. */
const STRENGTH_ICON: Record<string, string> = {
  security: 'shield',
  performance: 'bolt',
  reliability: 'check',
  value: 'parts',
  ecosystem: 'network',
  autonomy: 'bolt',
  coverage: 'globe',
  running: 'print',
  design: 'aio',
}
