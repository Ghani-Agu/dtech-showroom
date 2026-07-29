'use client'

/**
 * Client-side access to the chrome's navigation payload (categories, brands,
 * catalogue size). Provided once by the [locale] layout so any header/footer
 * in any skin can read it without prop-drilling through every route file.
 *
 * The default value is deliberately EMPTY rather than undefined: a chrome
 * component rendered outside the provider (a stray admin mount, a skin shell
 * used somewhere new) degrades to "no mega-menu" instead of throwing and
 * taking the whole header down with it.
 */

import { createContext, useContext } from 'react'
import { EMPTY_NAV, type NavData } from '@/types/nav'

const NavDataCtx = createContext<NavData>(EMPTY_NAV)

export function NavDataProvider({
  value,
  children,
}: {
  value: NavData
  children: React.ReactNode
}) {
  return <NavDataCtx.Provider value={value}>{children}</NavDataCtx.Provider>
}

export function useNavData(): NavData {
  return useContext(NavDataCtx)
}
