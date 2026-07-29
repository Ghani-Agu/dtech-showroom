import { Link } from '@/i18n/routing'
import { BrandMarkArt, getBrandMark } from '@/components/home/brand-marks'

/**
 * ROUND 19 (phase D) — a brand filter chip carrying the brand's real mark.
 * ROUND 20 — plus the brand NAME, and living in a one-row EdRail.
 *
 * Server component: `getBrandMark` is a pure lookup and `BrandMarkArt` emits
 * inline SVG, so this costs nothing on the client. Kept as its own file
 * purely so `EdProductsBrowser` stays readable.
 */
export function EdBrandChip({
  slug,
  name,
  count,
  href,
  active,
}: {
  slug: string
  name: string
  count: number
  href: string
  active: boolean
}) {
  const m = getBrandMark(slug, name)
  return (
    <Link
      href={href}
      className={`edp-bchip${active ? ' on' : ''}`}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      title={name}
      /* aria-label, not title: for the 16 brands with a vector mark the only
         DOM content is an `aria-hidden` <svg> and the count, so the accessible
         name computed from contents was a bare number — the whole strip
         announced as "link, 47" / "link, 31". `title` is never consulted once
         contents are non-empty. */
      aria-label={`${name} — ${count}`}
      style={{ ['--bc' as string]: m.tile, ['--bfg' as string]: m.fg }}
    >
      <span className="edp-bmark">
        <BrandMarkArt slug={slug} name={name} h={19} maxW={74} />
      </span>
      {/* The name is the whole point of round 20's rail: a dozen of these
          marks are pure logotype with no readable brand name inside them. */}
      <span className="edp-bname">{name}</span>
      <i>{count}</i>
    </Link>
  )
}
