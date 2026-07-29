'use client'

/**
 * ROUND 19 (phase D) — the catalogue card for the editorial skin.
 *
 * The old shared `ShowroomCard` is fine structurally but reads as a generic
 * e-commerce tile. Three changes carry most of the difference here:
 *
 *  1. the product photo gets real room (4:3, generous padding, white ground)
 *     instead of competing with a dense text block;
 *  2. the BRAND is shown as its actual vector mark on its own colour, not as
 *     a grey text kicker — that is the single strongest recognition cue in a
 *     grid of 24 near-identical boxes;
 *  3. the actions are hidden until hover on pointer devices and always
 *     visible on touch, so the resting grid stays calm without ever hiding a
 *     control from a phone.
 */

import type { ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { EIcon, WaIcon } from './editorial-icons'
import { useCart, WHATSAPP_NUMBER } from '@/lib/cart'
import type { ExplorerProduct } from '@/types/catalog'

export function EdCatalogCard({
  product,
  priority = false,
  mark,
  tile,
  fg,
}: {
  product: ExplorerProduct
  priority?: boolean
  /** Brand mark rendered on the SERVER — see the note below. */
  mark: ReactNode
  tile: string
  fg: string
}) {
  const { t } = useEditorial()
  const add = useCart((s) => s.add)
  const setOpen = useCart((s) => s.setOpen)
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    t('cat.wa') + product.name
  )}`

  /* The brand mark arrives as a prop rather than being looked up here.
     `brand-marks.tsx` + `editorial-logos.tsx` are ~34 KB of pure SVG path
     data; importing them from a 'use client' module that renders 24× per
     page would have shipped all of it to the browser for no reason, since
     nothing else on this route needs it client-side. */

  return (
    <article
      className="edp-card"
      style={{ ['--bc' as string]: tile, ['--bfg' as string]: fg }}
    >
      <Link className="edp-cardimg" href={`/products/${product.slug}`} tabIndex={-1} aria-hidden>
        {product.cardImagePath ? (
          <Image
            src={product.cardImagePath}
            alt=""
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 260px"
            style={{ objectFit: 'contain' }}
            priority={priority}
          />
        ) : null}
        <span className="edp-mark" aria-hidden>
          {mark}
        </span>
      </Link>

      <div className="edp-cardbody">
        {/* `edp-kicker`, not `edp-cat` — the rail's category LINKS own that
            class, and sharing it made the card's kicker inherit a link's
            padding, hover background and flex layout. */}
        <span className="edp-kicker">{product.categoryName}</span>
        <Link className="edp-name" href={`/products/${product.slug}`}>
          {product.name}
        </Link>
        <p className="edp-spec">{product.cardSpec}</p>

        <div className="edp-acts">
          <Link className="edp-view" href={`/products/${product.slug}`}>
            {t('card.view')}
          </Link>
          <button
            className="edp-icon"
            type="button"
            aria-label={t('aria.cart')}
            title={t('aria.cart')}
            onClick={() => {
              add({
                slug: product.slug,
                name: product.name,
                brand: product.brandName,
                image: product.cardImagePath ?? '',
              })
              setOpen(true)
            }}
          >
            <EIcon n="cart" s={15} />
          </button>
          <a
            className="edp-icon wa"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('aria.wa')}
            title={t('aria.wa')}
          >
            <WaIcon s={15} />
          </a>
        </div>
      </div>
    </article>
  )
}
