'use client'

import { useTranslations } from 'next-intl'
import { useCart } from '@/lib/cart'

/**
 * Always-reachable cart bubble (both designs). Appears once the cart has
 * items, hides while the drawer is open. Styled by the --sr-* tokens.
 */
export function FloatingCart() {
  const t = useTranslations('showroom.cart')
  const items = useCart((s) => s.items)
  const open = useCart((s) => s.open)
  const setOpen = useCart((s) => s.setOpen)
  const count = items.reduce((a, i) => a + i.qty, 0)
  if (count === 0 || open) return null
  return (
    <button type="button" className="sr-fab" aria-label={t('title')} onClick={() => setOpen(true)}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
      </svg>
      <span className="ct">{count}</span>
    </button>
  )
}
