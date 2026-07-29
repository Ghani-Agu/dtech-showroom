/**
 * Chrome navigation payload — shared by the server builder
 * (`@/server/nav-data`) and the client context (`@/components/layout/nav-data`).
 *
 * This file MUST stay free of `server-only` and of any database import: the
 * client context imports `EMPTY_NAV` from here at runtime, and pulling in the
 * server module would fail the client build.
 */

export interface NavCat {
  slug: string
  name: string
  count: number
  img: string | null
}

export interface NavBrand {
  slug: string
  name: string
  count: number
}

export interface NavData {
  cats: NavCat[]
  brands: NavBrand[]
  productCount: number
}

export const EMPTY_NAV: NavData = { cats: [], brands: [], productCount: 0 }
