'use client'

/**
 * Shared open/close state for the newsletter pop-up (ROUND 16) — a tiny
 * zustand store so the header buttons of ALL THREE skins (SiteNav,
 * BrandChrome, EditorialChrome) can open the same modal that the
 * [locale] layout mounts once. Mirrors the cart-store pattern.
 */

import { create } from 'zustand'

interface NlPopupState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useNlPopup = create<NlPopupState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
