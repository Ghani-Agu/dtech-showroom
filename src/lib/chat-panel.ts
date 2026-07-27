'use client'

/**
 * Shared open/close state for the D-Tech AI chat panel (ROUND 17) — a tiny
 * zustand store so the header buttons of ALL THREE skins (SiteNav,
 * BrandChrome, EditorialChrome) and the floating bubble can drive the same
 * panel, which the [locale] layout mounts once. Mirrors the cart-store and
 * newsletter-popup pattern.
 */

import { create } from 'zustand'

interface ChatPanelState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useChatPanel = create<ChatPanelState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
