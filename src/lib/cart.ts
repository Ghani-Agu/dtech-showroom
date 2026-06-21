'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.slug !== slug)
              : s.items.map((i) => (i.slug === slug ? { ...i, qty } : i)),
        })),
      remove: (slug) =>
        set((s) => ({ items: s.items.filter((i) => i.slug !== slug) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'dt-cart', partialize: (s) => ({ items: s.items }) }
  )
)

export const WHATSAPP_NUMBER = '213560990506'

/** Itemized WhatsApp order message (works for a single product too). */
export function whatsappOrderUrl(
  items: { name: string; qty: number }[],
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
