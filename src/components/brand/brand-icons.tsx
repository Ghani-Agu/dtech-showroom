/**
 * Brand skin icons — ported verbatim from the dtech Brand design
 * (dtech-sections.jsx + grid-art.jsx). Pure SVG, theme-aware via currentColor.
 * The `.flip` class is handled by the scoped CSS for RTL arrow mirroring.
 */

type IcProps = { s?: number }

export const Arrow = ({ s = 14 }: IcProps) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
)

export const IcTruck = ({ s = 22 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" /></svg>
)

export const IcShield = ({ s = 22 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
)

export const IcRepair = ({ s = 22 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4l-7 7 2 2 7-7a4 4 0 005.4-5.4l-2.5 2.5-2-2 2.5-2.5z" /></svg>
)

export const IcChat = ({ s = 22 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
)

export const CartIcon = ({ s = 16 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" /></svg>
)

export const CartIcon2 = ({ s = 17 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.5 3h2l2.2 12.4a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /></svg>
)

export const SunIcon = ({ s = 17 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)

export const MoonIcon = ({ s = 17 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)

export const WhatsAppIcon = ({ s = 17 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.95a10 10 0 00-14.1 14.14L4 22l3.04-.95a10 10 0 0014.1-14.1zM12 20.5a8.5 8.5 0 01-4.34-1.18l-.31-.18-2.45.76.78-2.39-.2-.32A8.5 8.5 0 1112 20.5zm4.84-6.36c-.27-.13-1.57-.78-1.81-.87-.24-.09-.42-.13-.6.13s-.69.87-.84 1.05c-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.59-1.49-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46l-.51-.01c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.76.13.18 1.88 2.88 4.57 4.04.64.28 1.14.44 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.27.22-.62.22-1.15.16-1.26-.06-.12-.24-.18-.51-.31z" /></svg>
)

export const PhoneIcon = ({ s = 19 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" /></svg>
)

export const RouteIcon = ({ s = 19 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
)

export const ChevronLeft = ({ s = 16 }: IcProps) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
)

export const ChevronRight = ({ s = 16 }: IcProps) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
)

export const PageArrowPrev = ({ s = 12 }: IcProps) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
)

export const PageArrowNext = ({ s = 12 }: IcProps) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
)

export const FacebookIcon = ({ s = 16 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.4v7A10 10 0 0022 12z" /></svg>
)

export const InstagramIcon = ({ s = 16 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
)

export const LinkedInIcon = ({ s = 16 }: IcProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.3 18.3H5.7V10h2.6v8.3zM7 8.7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11.3 9.6h-2.6V14c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1V18.3h-2.6V10h2.5v1c.4-.6 1.2-1.3 2.5-1.3 1.8 0 2.9 1.2 2.9 3.6v5z" /></svg>
)

/** Category line-art icon (ported from grid-art.jsx GridCatIcon). */
export function GridCatIcon({ kind, size = 26 }: { kind: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'desktop': return <svg {...p}><rect x="3" y="4" width="18" height="13" rx="0.5" /><path d="M8 21h8M12 17v4" /></svg>
    case 'laptop': return <svg {...p}><rect x="3" y="4" width="18" height="12" rx="0.5" /><path d="M2 20h20" /></svg>
    case 'aio': return <svg {...p}><rect x="2" y="4" width="20" height="14" rx="0.5" /><path d="M8 22h8M12 18v4M2 14h20" /></svg>
    case 'tablet': return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M11 18h2" /></svg>
    case 'phone': return <svg {...p}><rect x="7" y="2" width="10" height="20" rx="1.5" /><path d="M11 19h2" /></svg>
    case 'print': return <svg {...p}><rect x="6" y="3" width="12" height="6" /><rect x="3" y="9" width="18" height="9" rx="0.5" /><rect x="6" y="14" width="12" height="6" /></svg>
    case 'network': return <svg {...p}><circle cx="12" cy="18" r="2" /><path d="M6 12a8 8 0 0112 0M3 8a14 14 0 0118 0M9 15a5 5 0 016 0" /></svg>
    case 'parts': return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="0.5" /><rect x="8" y="8" width="8" height="8" /><path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2" /></svg>
    case 'gaming': return <svg {...p}><path d="M6 11h4M8 9v4" /><circle cx="15" cy="11" r="1" /><circle cx="17.5" cy="13" r="0.8" /><rect x="2" y="6" width="20" height="12" rx="4" /></svg>
    default: return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>
  }
}
