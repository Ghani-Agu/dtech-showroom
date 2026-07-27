/**
 * Éditorial icons — VERBATIM port of the design's EDPATH stroke-icon system
 * (dtech-ed-parts.jsx) plus the WhatsApp glyph. `EIcon n="…"` renders a
 * 24×24 stroke icon; [PORT] adds a `cart` path for the live shop.
 */

import type { CSSProperties } from 'react'

export const EDPATH: Record<string, string> = {
  desktop: 'M3 5h18v11H3z M8 20h8 M12 16v4',
  laptop: 'M4 6h16v10H4z M2 19h20',
  aio: 'M3 4h18v12H3z M9 20h6 M12 16v4',
  tablet: 'M6 3h12v18H6z M11 18h2',
  phone: 'M8 2h8v20H8z M11 18.5h2',
  print: 'M7 8V3h10v5 M6 18h12v3H6z M4 8h16v10H4z',
  network: 'M12 3v6 M5 21v-6 M19 21v-6 M5 15h14 M9 9h6v6H9z',
  parts: 'M7 7h10v10H7z M12 2v3 M12 19v3 M2 12h3 M19 12h3',
  gaming: 'M7 12h4 M9 10v4 M15 12h.01 M17.5 14h.01 M6 7h12l3 10H3z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  shield: 'M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z',
  truck: 'M3 7h11v9H3z M14 10h4l3 3v3h-7z M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  wrench: 'M15 4a5 5 0 0 0-6.7 6.3L3 15.6 5.4 18l5.3-5.3A5 5 0 0 0 17 6l-2.5 2.5L12 6l2.5-2.5z',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 10h.01',
  mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
  tel: 'M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z',
  check: 'M4 12l5 5L20 6',
  arrow: 'M6 18 18 6 M9 6h9v9',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6 6 18',
  menu: 'M4 8h16 M4 16h16',
  chevL: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c3 3.5 3 16.5 0 20 M12 2c-3 3.5-3 16.5 0 20',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
  /* [PORT] AI assistant — same geometric vocabulary as `desktop`/`aio`:
     a stroked head, an antenna and two eyes. */
  chat: 'M4 8h16v10H4z M12 8V4.6 M9.3 12.6h.01 M14.7 12.6h.01 M9.6 15.4c1.5.8 3.3.8 4.8 0',
  /* [PORT] cart for the live shop */
  cart: 'M3 4h2.4l2 11.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2 M9.5 20.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2 M17 20.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2',
}

export function EIcon({
  n,
  s = 20,
  sw = 1.6,
  style,
}: {
  n: string
  s?: number
  sw?: number
  style?: CSSProperties
}) {
  const d = EDPATH[n] ?? EDPATH.parts ?? ''
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {d.split(' M').map((p, i) => (
        <path key={i} d={(i ? 'M' : '') + p} />
      ))}
    </svg>
  )
}

export const WaIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
  </svg>
)

/* [PORT] compat aliases — inner-page components (collections, product
   detail) were written against these names. */
export const EdArrowUpRight = ({ size = 16 }: { size?: number }) => <EIcon n="arrow" s={size} sw={2} />
export const EdArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg className="ed-arrow-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>
)
export const EdWhatsApp = ({ size = 18 }: { size?: number }) => <WaIcon s={size} />
export const EdCart = ({ size = 17 }: { size?: number }) => <EIcon n="cart" s={size} sw={1.7} />
export const EdPhone = ({ size = 17 }: { size?: number }) => <EIcon n="tel" s={size} sw={1.7} />
export const EdMail = ({ size = 17 }: { size?: number }) => <EIcon n="mail" s={size} sw={1.7} />
export const EdPin = ({ size = 17 }: { size?: number }) => <EIcon n="pin" s={size} sw={1.7} />
export const EdClose = ({ size = 20 }: { size?: number }) => <EIcon n="close" s={size} sw={2} />
export const EdMenu = ({ size = 18 }: { size?: number }) => <EIcon n="menu" s={size} sw={2} />
export const EdWrench = ({ size = 20 }: { size?: number }) => <EIcon n="wrench" s={size} />
export const EdBox = ({ size = 20 }: { size?: number }) => <EIcon n="truck" s={size} />
export const EdShield = ({ size = 20 }: { size?: number }) => <EIcon n="shield" s={size} />
export const EdClock = ({ size = 20 }: { size?: number }) => <EIcon n="clock" s={size} />
export const EdSparkle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0c.6 6.3 5.1 10.8 12 12-6.9 1.2-11.4 5.7-12 12-.6-6.3-5.1-10.8-12-12C6.9 10.8 11.4 6.3 12 0z" />
  </svg>
)
