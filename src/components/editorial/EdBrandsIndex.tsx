'use client'

/**
 * ROUND 19 — /brands, rebuilt.
 *
 * The old index was a flat list of name + count linking straight into the
 * filtered catalogue, which threw away the single most interesting thing
 * about this shop: the brands are NOT all the same kind of relationship.
 * Two are Hartech's own, two are exclusive to it in Algeria, two are official
 * distributions, the rest are carried. Grouping by that turns a list into an
 * argument — and each card now leads to a real brand page.
 *
 * Status comes from `ed-brand-facts.ts`; read the note there before promoting
 * any brand, it is a commercial claim rather than a design choice.
 */

import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { brandStatus, type EdBrandStatus } from './ed-brand-facts'
import { getBrandMark, BrandMarkArt } from '@/components/home/brand-marks'
import type { BrandBrandItem } from '@/components/brand/brand-types'

/** Display order — most-owned relationship first. */
const GROUPS: { status: EdBrandStatus; key: string }[] = [
  { status: 'own', key: 'own' },
  { status: 'exclusive', key: 'excl' },
  { status: 'official', key: 'off' },
  { status: 'distributed', key: 'dist' },
]

/* Chaque bloc est exporté à part pour que l'éditeur web puisse les réordonner
   ou en masquer un individuellement ; chacun recalcule ce dont il a besoin. */

/** ── En-tête de page ── */
export function EdBiHead({ brands }: { brands: BrandBrandItem[] }) {
  const { t, tf } = useEditorial()
  const refs = brands.reduce((a, b) => a + b.count, 0)

  return (
    <header className="ed-pagehead wrap">
      <div className="rv" data-revealed style={{ display: 'grid', gap: 14 }}>
        <span className="eyebrow">{t('bi.eyebrow')}</span>
        <h1 className="h2">{t('bi.title')}</h1>
        <p className="lede">{tf('bi.lede', { count: brands.length, refs })}</p>
      </div>
    </header>
  )
}

/** ── Les quatre groupes de statut ── */
export function EdBiGroups({ brands }: { brands: BrandBrandItem[] }) {
  const { t } = useEditorial()

  return (
    <div className="wrap edbi-body">
        {GROUPS.map(({ status, key }) => {
          const list = brands.filter((b) => brandStatus(b.id) === status)
          if (!list.length) return null
          return (
            <section className="edbi-group rv" key={status} data-g={status}>
              <div className="edbi-ghead">
                <h2>{t(`bi.${key}`)}</h2>
                <p>{t(`bi.${key}.d`)}</p>
              </div>
              {/* ROUND 20 — `auto-fill` left two dead columns in the own and
                  exclusive groups (two brands each), so the page read as
                  half-loaded. Groups of three or fewer switch to a wide
                  horizontal card that fills the row and has room for the
                  relationship badge. */}
              <div className={`edbi-grid${list.length <= 3 ? ' wide' : ''}`}>
                {list.map((b, i) => {
                  const m = getBrandMark(b.id, b.name)
                  return (
                    <Link
                      className="edbi-card stag"
                      key={b.id}
                      href={`/brands/${b.id}`}
                      style={{
                        ['--i' as string]: String(i),
                        ['--bc' as string]: m.tile,
                        ['--bfg' as string]: m.fg,
                      }}
                    >
                      <span className="edbi-tile">
                        <BrandMarkArt slug={b.id} name={b.name} h={38} maxW={132} />
                      </span>
                      <span className="edbi-txt">
                        <span className="edbi-meta">
                          <b>{b.name}</b>
                          <i>
                            {b.count} {t('bi.refs')}
                          </i>
                        </span>
                        <span className="edbi-badge" data-s={status}>
                          {t(`bstat.${status}`)}
                        </span>
                        <span className="edbi-go">
                          {t('bi.see')} <em aria-hidden>→</em>
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
    </div>
  )
}

export function EdBrandsIndex({ brands }: { brands: BrandBrandItem[] }) {
  return (
    <div className="edbi">
      <EdBiHead brands={brands} />
      <EdBiGroups brands={brands} />
    </div>
  )
}
