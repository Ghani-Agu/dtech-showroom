'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from './analytics'

export interface CartItem {
  slug: string
  name: string
  brand: string
  image: string
  qty: number
}

interface CartState {
  items: CartItem[]
  open: boolean
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item, qty = 1) =>
        set((s) => {
          // The store is the single choke point for every "add to cart" in the
          // app (both skins, cards, PDP, sticky bar), so tracking here means
          // no call site can forget it.
          analytics.addToCart({
            slug: item.slug,
            name: item.name,
            brandName: item.brand,
            quantity: qty,
          })
          const existing = s.items.find((i) => i.slug === item.slug)
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.slug === item.slug ? { ...i, qty: i.qty + qty } : i
              ),
            }
          }
          return { items: [...s.items, { ...item, qty }] }
        }),
      setQty: (slug, qty) =>
        set((s) => {
          if (qty <= 0) {
            // The drawer's "−" button reaches this at qty 1, so it is a real
            // removal path and has to report like one.
            const gone = s.items.find((i) => i.slug === slug)
            if (gone) {
              analytics.removeFromCart({
                slug: gone.slug,
                name: gone.name,
                brandName: gone.brand,
                quantity: gone.qty,
              })
            }
            return { items: s.items.filter((i) => i.slug !== slug) }
          }
          return {
            items: s.items.map((i) => (i.slug === slug ? { ...i, qty } : i)),
          }
        }),
      remove: (slug) =>
        set((s) => {
          const gone = s.items.find((i) => i.slug === slug)
          if (gone) {
            analytics.removeFromCart({
              slug: gone.slug,
              name: gone.name,
              brandName: gone.brand,
              quantity: gone.qty,
            })
          }
          return { items: s.items.filter((i) => i.slug !== slug) }
        }),
      clear: () =>
        set((s) => {
          for (const i of s.items) {
            analytics.removeFromCart({
              slug: i.slug,
              name: i.name,
              brandName: i.brand,
              quantity: i.qty,
            })
          }
          return { items: [] }
        }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'dt-cart', partialize: (s) => ({ items: s.items }) }
  )
)

export const WHATSAPP_NUMBER = '213560990506'

/** Itemized WhatsApp order message (works for a single product too). */
export interface OrderLine {
  name: string
  qty: number
  /** Product slug — keeps GA `item_id` consistent with view/add events. */
  slug?: string
}

/**
 * Fire the WhatsApp-handoff conversion. Call this from the link's onClick, NOT
 * from whatsappOrderUrl: the URL is built during render (it's an `href`), so
 * tracking inside it counted a checkout on every render — on page load, on
 * every quantity change, on every scroll past the sticky bar.
 */
export function trackWhatsappOrder(items: OrderLine[]): void {
  analytics.beginCheckout(
    items.map((i) => ({
      slug: i.slug ?? i.name,
      name: i.name,
      quantity: i.qty,
    })),
    'whatsapp'
  )
}

export function whatsappOrderUrl(
  items: OrderLine[],
  intro: string
): string {
  const lines = [
    intro,
    '',
    ...items.map((i) => `• ${i.name} × ${i.qty}`),
    '',
  ]
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
}
