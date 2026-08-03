/**
 * client-marks — the "ils nous ont fait confiance" wall on /company.
 *
 * ROUND 27. Built to READ LIKE THE DISTRIBUTION WALL (`brand-marks.tsx`),
 * because that is the pattern Ghani pointed at: a solid tile in the brand's
 * colour, the mark reversed out of it, tiles the same size in a tight grid.
 * Same shape of data on purpose — `tile` / `fg` here mirror `BrandMark`.
 *
 * The one addition is `glow`: a coloured bloom under each tile (the "glow
 * light" he asked for). It is the VIVID brand colour, while `tile` is a
 * deepened variant — see Colours below.
 *
 * ── How a real logo gets in ───────────────────────────────────────────────
 * Drop the file in `public/images/clients/` and fill in `logo`:
 *
 *     { slug: 'djezzy', …, logo: '/images/clients/djezzy.svg' }
 *
 * That is the ONLY edit needed. **Use the WHITE / single-colour version of
 * the logo**, exactly like the distribution wall does — `BrandMarkArt` fills
 * its paths with `currentColor` so every mark comes out in `fg` on a coloured
 * tile. A full-colour logo dropped on a coloured tile will clash; nearly every
 * brand publishes a mono version for precisely this use.
 *
 * Until a `logo` is set the tile prints a typographic wordmark — which is not
 * a downgrade, it is what MERCUSYS, HIKSEMI, GAME REVOLUTION and REACTION
 * already do in the distribution wall (`WORD_MARKS` in brand-marks.tsx).
 * What this file will never do is invent vector art for somebody else's
 * trademark: a redrawn-from-memory Mobilis or Djezzy mark is wrong AND theirs.
 *
 * ── Colours ───────────────────────────────────────────────────────────────
 * `tile` is the solid background and every value here clears 4.5:1 against
 * white type (Mobilis' true #55BA4A is 2.47:1 — unusable as a tile, hence the
 * deepened #2E7D32). `glow` keeps the vivid brand colour for the bloom, where
 * contrast does not apply. Sources are marked per entry; three are flagged
 * provisional.
 *
 * ⚠️ CLIENT-GRAPH ONLY. This module attaches an `onError` handler, so it must
 * be imported from a `'use client'` component (EdCompanyPage is one). Do NOT
 * import it from a server component — and note the opposite trap documented
 * in brand-marks.tsx: a *data* module must not be `'use client'`, or a server
 * component reading its objects gets flight proxies instead of values.
 */

export interface ClientMark {
  slug: string
  /** Full name — the accessible label, and the image alt text. */
  name: string
  /** The big line of the wordmark, when there is no logo file. */
  word: string
  /** Optional small line under it, for names too long to set at full size. */
  sub?: string
  /** Solid tile background. Must clear 4.5:1 against `fg`. */
  tile: string
  /** Mark colour on the tile — white unless the tile is a light one. */
  fg: string
  /** Vivid brand colour, used only for the bloom under the tile. */
  glow: string
  /** Set this once a WHITE/mono file exists under public/images/clients/. */
  logo?: string
}

/** From the company profile deck. Order is his. */
export const ED_CLIENTS: ClientMark[] = [
  {
    slug: 'mobilis',
    name: 'Mobilis',
    word: 'Mobilis',
    // Sourced: the ATM Mobilis mark reads #55BA4A green with a #EE3124 red arc.
    tile: '#2E7D32',
    fg: '#ffffff',
    glow: '#55BA4A',
  },
  {
    slug: 'djezzy',
    name: 'Djezzy',
    word: 'Djezzy',
    // Sourced: Djezzy red #E20613 — it clears 4.9:1, so the tile is the real one.
    tile: '#E20613',
    fg: '#ffffff',
    glow: '#FF2A38',
  },
  {
    slug: 'algerie-telecom',
    name: 'Algérie Télécom',
    word: 'Algérie Télécom',
    // Sourced: AT green #00AA5B + blue #2B5EAC.
    tile: '#0C7A49',
    fg: '#ffffff',
    glow: '#00AA5B',
  },
  {
    slug: 'cpa',
    name: 'Crédit Populaire d’Algérie',
    word: 'CPA',
    sub: 'Crédit Populaire d’Algérie',
    // ⚠️ PROVISIONAL — no published charter found. Change these three values.
    tile: '#1E6FB8',
    fg: '#ffffff',
    glow: '#2B84D8',
  },
  {
    slug: 'opgi',
    name: 'OPGI',
    word: 'OPGI',
    sub: 'Gestion immobilière',
    // ⚠️ PROVISIONAL — OPGI marks differ per wilaya. Change these three values.
    tile: '#8A5E1C',
    fg: '#ffffff',
    glow: '#C0873A',
  },
  {
    slug: 'bab-ezzouar',
    name: 'Bab Ezzouar Centre Commercial',
    word: 'Bab Ezzouar',
    sub: 'Centre commercial',
    // ⚠️ PROVISIONAL. Change these three values.
    tile: '#A64BA8',
    fg: '#ffffff',
    glow: '#C45FC6',
  },
]

/**
 * The mark itself: the real file when one is declared, the wordmark otherwise.
 *
 * The `onError` is a safety net, not the mechanism — if a declared file is
 * missing or corrupt the tile falls back to the wordmark instead of leaving a
 * broken-image hole. It runs without React state on purpose, so this module
 * stays importable as plain data.
 */
export function ClientMarkArt({ mark }: { mark: ClientMark }) {
  if (mark.logo) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="edcy-cimg"
          src={mark.logo}
          alt={mark.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget
            img.hidden = true
            img.nextElementSibling?.removeAttribute('hidden')
          }}
        />
        <span className="edcy-cword" hidden>
          {mark.word}
          {mark.sub ? <span className="edcy-csub">{mark.sub}</span> : null}
        </span>
      </>
    )
  }
  return (
    <span className="edcy-cword">
      {mark.word}
      {mark.sub ? <span className="edcy-csub">{mark.sub}</span> : null}
    </span>
  )
}
