'use client'

/**
 * ROUND 19 — /catalogue, the "browse by family" surface.
 *
 * The distinction with /products is deliberate and load-bearing:
 *   • /catalogue  — editorial, image-led, no state. You LOOK at what exists.
 *   • /products   — the filterable grid of every reference. You SEARCH.
 *
 * Everything here is either a link or a CSS transition, so the page is fully
 * static: no fetch on mount, no layout thrash, and it prerenders as ISR.
 * The only JS is the sticky family rail's scroll-spy, which is one rAF-gated
 * IntersectionObserver.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { groupByFamily } from './ed-families'
import { FamilyIcon } from './editorial-icons'
import type { NavCat } from '@/types/nav'

export function EdCataloguePage({
  cats,
  productCount,
}: {
  cats: NavCat[]
  productCount: number
}) {
  const { t } = useEditorial()
  const groups = groupByFamily(cats)
  const [active, setActive] = useState(groups[0]?.family.id ?? '')
  const railRef = useRef<HTMLDivElement>(null)

  /* Scroll-spy for the sticky family rail. Observer, not a scroll handler:
     it stays quiet while the visitor is not crossing a boundary. */
  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-fam]'))
    if (!secs.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive((hit.target as HTMLElement).dataset.fam ?? '')
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    )
    secs.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  /* Keep the active chip in view on narrow screens, where the rail scrolls. */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const chip = rail.querySelector<HTMLElement>(`[data-chip='${active}']`)
    if (!chip) return
    const r = chip.getBoundingClientRect()
    const rr = rail.getBoundingClientRect()
    if (r.left < rr.left || r.right > rr.right) {
      rail.scrollTo({ left: chip.offsetLeft - 24, behavior: 'smooth' })
    }
  }, [active])

  return (
    <div className="edc">
      <header className="edc-head rv">
        <span className="eyebrow">{t('cpage.eyebrow')}</span>
        <h1 className="h2">{t('cpage.title')}</h1>
        <p className="lede">{t('cpage.lede')}</p>
        <div className="edc-meta">
          <span>
            <b>{productCount}</b> {t('cpage.refs')}
          </span>
          <span>
            <b>{cats.length}</b> {t('cpage.families')}
          </span>
          <Link className="btn btn-k" href="/products">
            {t('cpage.all')}
          </Link>
        </div>
      </header>

      <div
        className="edc-rail"
        ref={railRef}
        role="navigation"
        aria-label={t('cpage.jump')}
        data-lenis-prevent
      >
        {groups.map(({ family }) => (
          <a
            key={family.id}
            data-chip={family.id}
            href={`#fam-${family.id}`}
            className={`edc-chip${active === family.id ? ' on' : ''}`}
            style={{ ['--h' as string]: String(family.hue) }}
          >
            <FamilyIcon n={family.icon} />
            {t(`fam.${family.id}`)}
          </a>
        ))}
      </div>

      {groups.map(({ family, cats: fc }, gi) => (
        <section
          className="edc-fam rv"
          id={`fam-${family.id}`}
          data-fam={family.id}
          key={family.id}
          style={{ ['--h' as string]: String(family.hue) }}
        >
          <div className="edc-famhead">
            <span className="edc-famn">{String(gi + 1).padStart(2, '0')}</span>
            <div>
              <h2>
                <FamilyIcon n={family.icon} />
                {t(`fam.${family.id}`)}
              </h2>
              <p>{t(`fam.${family.id}.d`)}</p>
            </div>
            <span className="edc-famc">
              {fc.reduce((a, c) => a + c.count, 0)} {t('cpage.refs')}
            </span>
          </div>

          <div className="edc-grid">
            {fc.map((c, i) => (
              <Link
                className={`edc-card${i === 0 && fc.length > 2 ? ' wide' : ''}`}
                href={`/products?category=${c.slug}`}
                key={c.slug}
              >
                <span className="edc-img">
                  {c.img ? (
                    <Image
                      src={c.img}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="edc-ph" aria-hidden>
                      <FamilyIcon n={family.icon} s={34} />
                    </span>
                  )}
                </span>
                <span className="edc-glow" aria-hidden />
                <span className="edc-body">
                  <b className="edc-count">
                    {c.count} {t('cpage.refs')}
                  </b>
                  <b className="edc-name">{c.name}</b>
                  <span className="edc-go">
                    {t('cpage.explore')} <i aria-hidden>→</i>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
