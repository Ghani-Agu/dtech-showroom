'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import './partner-band.css'

/**
 * Partner spotlight band — a full-bleed colour block for the distributor's
 * flagship brand, with a 2×2 grid of product-family tiles.
 *
 * One component serves BOTH storefront skins. It can, because the band paints
 * its own background in the PARTNER's colour rather than the site's accent —
 * that contrast is the point of the section. Colours come from `--pb-*` tokens
 * set inline from `accent`, so nothing here depends on `--sr-*` or the
 * `.home-showcase-root` / `.brand-root` scopes.
 *
 * Text arrives as ReactNode so the classic skin can pass `<Editable>` nodes
 * (inline site editor) while the brand skin passes plain strings — neither
 * needs to know about the other's editing system.
 */

export interface PartnerTile {
  /** Category slug — the tile links to this brand ∩ this category. */
  categorySlug: string
  /** Display title, e.g. "HP Écrans". */
  title: string
  /** Sub-line, e.g. "19 produits". */
  sub: string
  icon: PartnerIconKind
}

export type PartnerIconKind =
  | 'laptop'
  | 'monitor'
  | 'aio'
  | 'printer'
  | 'desktop'
  | 'network'
  | 'gaming'
  | 'parts'

export function PartnerBand({
  brandSlug,
  brandName,
  logoPath,
  accent,
  accentDeep,
  eyebrow,
  partnerLine,
  heading,
  sub,
  ctaLabel,
  tiles,
}: {
  brandSlug: string
  brandName: string
  /** Real partner logo when one has been uploaded; falls back to a wordmark. */
  logoPath?: string | null
  /** Partner brand colour. */
  accent: string
  accentDeep: string
  eyebrow: ReactNode
  partnerLine: ReactNode
  heading: ReactNode
  sub: ReactNode
  ctaLabel: ReactNode
  tiles: PartnerTile[]
}) {
  if (tiles.length === 0) return null

  return (
    <section
      className="pb-band"
      id="partner"
      style={
        {
          '--pb-accent': accent,
          '--pb-accent-deep': accentDeep,
        } as React.CSSProperties
      }
    >
      <div className="pb-inner">
        <div className="pb-left">
          <div className="pb-badge-row">
            <span className="pb-logo" aria-hidden={logoPath ? undefined : true}>
              {logoPath ? (
                <Image
                  src={logoPath}
                  alt={brandName}
                  width={44}
                  height={44}
                  sizes="44px"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <span className="pb-logo-mark">{initials(brandName)}</span>
              )}
            </span>
            <span className="pb-badge-text">
              <strong>{eyebrow}</strong>
              <small>{partnerLine}</small>
            </span>
          </div>

          <h2 className="pb-title">{heading}</h2>
          <p className="pb-sub">{sub}</p>

          <Link
            href={{ pathname: '/products', query: { brand: brandSlug } }}
            className="pb-cta"
          >
            {ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <ul className="pb-tiles">
          {tiles.map((t) => (
            <li key={t.categorySlug}>
              <Link
                className="pb-tile"
                href={{
                  pathname: '/products',
                  query: { brand: brandSlug, category: t.categorySlug },
                }}
              >
                <PartnerIcon kind={t.icon} />
                <span className="pb-tile-title">{t.title}</span>
                <span className="pb-tile-sub">{t.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** "TP-Link" → "TP", "HP" → "HP". Used only when no logo has been uploaded. */
function initials(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, '')
  return cleaned.slice(0, 2).toUpperCase() || '·'
}

/**
 * Self-contained line icons. Deliberately not reusing the storefront's CatIcon:
 * that lives inside HomeShowcase, and importing it here would couple the band
 * to the classic skin it also has to render outside of.
 */
function PartnerIcon({ kind }: { kind: PartnerIconKind }) {
  const p = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'pb-tile-icon',
  }
  switch (kind) {
    case 'laptop':
      return (
        <svg {...p}>
          <rect x="4" y="5" width="16" height="10" rx="1.6" />
          <path d="M2 19h20" />
        </svg>
      )
    case 'monitor':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="12" rx="1.6" />
          <path d="M9 20h6M12 16v4" />
        </svg>
      )
    case 'aio':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="12" rx="1.6" />
          <path d="M7 20h10M12 16v4" />
          <path d="M6.5 13.5h5" />
        </svg>
      )
    case 'printer':
      return (
        <svg {...p}>
          <path d="M7 9V4h10v5" />
          <rect x="4" y="9" width="16" height="7" rx="1.6" />
          <path d="M7 14h10v6H7z" />
        </svg>
      )
    case 'desktop':
      return (
        <svg {...p}>
          <rect x="6" y="3" width="12" height="18" rx="1.8" />
          <path d="M9.5 7h5M9.5 10.5h5" />
          <circle cx="12" cy="16.5" r="1.2" />
        </svg>
      )
    case 'network':
      return (
        <svg {...p}>
          <rect x="3" y="13" width="18" height="7" rx="1.6" />
          <path d="M12 13V8M7 8h10M7 8v2M17 8v2" />
          <circle cx="7.5" cy="16.5" r=".9" />
          <circle cx="11" cy="16.5" r=".9" />
        </svg>
      )
    case 'gaming':
      return (
        <svg {...p}>
          <path d="M7 11h4M9 9v4" />
          <circle cx="15.5" cy="11" r="1" />
          <path d="M6.2 7h11.6a3 3 0 0 1 2.95 2.46l.9 5A3 3 0 0 1 18.7 18c-1 0-1.6-.6-2.2-1.3L15.4 15H8.6l-1.1 1.7C6.9 17.4 6.3 18 5.3 18a3 3 0 0 1-2.95-3.54l.9-5A3 3 0 0 1 6.2 7z" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      )
  }
}
