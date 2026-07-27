'use client'

/**
 * Éditorial chrome — VERBATIM port of the design's nav/cursor/menu/footer
 * (dtech-ed-parts.jsx + EdFooter from dtech-ed-sections.jsx):
 *  - PillNav: light glass pill that flips DARK over `[data-band="dark"]`
 *    sections (probe at y=78), with the RollLabel scroll-spy section label;
 *  - EdCursor: lerped sparkle cursor (core snaps, trail eases at .22),
 *    link/press states, hover:hover + pointer:fine only;
 *  - MenuOverlay: numbered index with hover preview panel;
 *  - EdFooter: floating dark rounded footer, yellow accents.
 * [PORT] marks: cart circ in the pill, route-vs-anchor nav on inner pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter, Link } from '@/i18n/routing'
import { useEditorial } from './editorial-context'
import { useCart } from '@/lib/cart'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { EIcon, WaIcon } from './editorial-icons'
import { useNlPopup } from '@/lib/newsletter-popup'
import { useChatPanel } from '@/lib/chat-panel'

/* ROUND 16 — newsletter pop-up trigger (no customer accounts). */
const NL_LABEL: Record<'fr' | 'en' | 'ar', string> = {
  fr: 'Newsletter',
  en: 'Newsletter',
  ar: 'النشرة البريدية',
}

/* ROUND 17 — D-Tech AI assistant trigger. */
const CHAT_LABEL: Record<'fr' | 'en' | 'ar', string> = {
  fr: 'Assistant D-Tech',
  en: 'D-Tech Assistant',
  ar: 'مساعد D-Tech',
}

export const ED_PHONE_DISPLAY = '+213 560 99 05 06'
export const ED_PHONE_TEL = '+213560990506'
export const ED_SAV_DISPLAY = '0561 616 911'
export const ED_SAV_TEL = '+213561616911'
export const ED_EMAIL = 'contact@dtech.dz'
export const WA = 'https://wa.me/213560990506'

/** [key, anchor(home), route(inner pages)] */
const NAV: [string, string, string][] = [
  ['nav.home', '#accueil', '/'],
  ['nav.catalogue', '#catalogue', '/products'],
  ['nav.brands', '#marques', '/brands'],
  ['nav.why', '#pourquoi', '/about'],
  // ROUND 13: the categories-overview page redirects to /products — deep-link
  // the nav straight there (one catalogue surface, URL-driven filters).
  ['nav.ranges', '#gammes', '/products'],
  ['nav.contact', '#contact', '/about'],
]

/* ─────────── cursor (design EdCursor, verbatim behaviour) ─────────── */

export function EdCursor() {
  const { rootRef } = useEditorial()
  useEffect(() => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return
    const root = rootRef.current
    if (!root) return
    const el = document.createElement('div')
    el.className = 'cur'
    el.innerHTML =
      '<span class="cur-trail"></span><svg class="cur-core" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c.6 6.3 5.1 10.8 12 12-6.9 1.2-11.4 5.7-12 12-.6-6.3-5.1-10.8-12-12C6.9 10.8 11.4 6.3 12 0z"/></svg>'
    root.appendChild(el)
    root.classList.add('cur-on')
    const core = el.querySelector<HTMLElement>('.cur-core')!
    const trail = el.querySelector<HTMLElement>('.cur-trail')!
    let x = innerWidth / 2
    let y = innerHeight / 2
    let tx = x
    let ty = y
    let raf = 0
    const loop = () => {
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
      core.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(10deg)`
      trail.style.transform = `translate3d(${x}px,${y}px,0)`
      raf = requestAnimationFrame(loop)
    }
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const t = (e.target as Element | null)?.closest?.('a,button')
      root.classList.toggle('cur-link', !!t)
    }
    const dn = () => root.classList.add('cur-press')
    const up = () => root.classList.remove('cur-press')
    const out = () => root.classList.remove('cur-on')
    const inn = () => root.classList.add('cur-on')
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', dn)
    addEventListener('pointerup', up)
    document.addEventListener('mouseleave', out)
    document.addEventListener('mouseenter', inn)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      el.remove()
      root.classList.remove('cur-on', 'cur-link', 'cur-press')
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', dn)
      removeEventListener('pointerup', up)
      document.removeEventListener('mouseleave', out)
      document.removeEventListener('mouseenter', inn)
    }
  }, [rootRef])
  return null
}

/* ─────────── tone + scroll-spy (design useChrome) ─────────── */

function useChrome(homeLabels: string[]) {
  const { rootRef } = useEditorial()
  const [lab, setLab] = useState(homeLabels[0] ?? '')
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let raf = 0
    const upd = () => {
      raf = 0
      const y = 78
      let t: 'light' | 'dark' = 'light'
      root.querySelectorAll<HTMLElement>('[data-band="dark"]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= y && r.bottom >= y) t = 'dark'
      })
      root.setAttribute('data-tone', t)
      let cur = homeLabels[0] ?? ''
      NAV.forEach(([, h], i) => {
        const el = root.querySelector(h)
        if (el && el.getBoundingClientRect().top <= y + 60) cur = homeLabels[i] ?? cur
      })
      setLab(cur)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(upd)
    }
    upd()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, homeLabels.join('|')])
  return { lab }
}

/* ─────────── rolling section label (design RollLabel) ─────────── */

function RollLabel({ text }: { text: string }) {
  const [cur, setCur] = useState(text)
  const [prev, setPrev] = useState<string | null>(null)
  useEffect(() => {
    if (text === cur) return
    setPrev(cur)
    setCur(text)
    const t = setTimeout(() => setPrev(null), 240)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <span className="pill-lab">
      {prev && (
        <b className="out" key={'p' + prev}>
          {prev}
        </b>
      )}
      <b className="in" key={'c' + cur}>
        {cur}
      </b>
    </span>
  )
}

/* ─────────── language selection ─────────── */

const ED_LANGS: { id: 'fr' | 'en' | 'ar'; label: string }[] = [
  { id: 'fr', label: 'FR' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
]

/**
 * FR/EN/AR segmented switch — same route-based locale switching as the other
 * skins' headers (router.replace keeps the visitor on the SAME page in the
 * new locale). Styles live in showroom.css (`.editorial-root .pill-lang`),
 * following the pill's light/dark tone flip.
 */
export function LangSeg() {
  const { t, lang } = useEditorial()
  const router = useRouter()
  const pathname = usePathname()
  return (
    <div className="pill-lang" role="group" aria-label={t('aria.lang')}>
      {ED_LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === lang ? 'on' : undefined}
          aria-pressed={l.id === lang}
          onClick={() => {
            if (l.id !== lang) router.replace(pathname, { locale: l.id })
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────── pill nav ─────────── */

function CartCirc() {
  const { t } = useEditorial()
  const items = useCart((s) => s.items)
  const setOpen = useCart((s) => s.setOpen)
  const count = items.reduce((a, i) => a + i.qty, 0)
  return (
    <button className="circ" aria-label={t('aria.cart')} onClick={() => setOpen(true)}>
      <EIcon n="cart" s={17} />
      {count > 0 ? <span className="cartn">{count}</span> : null}
    </button>
  )
}

function NewsletterCirc() {
  const { lang } = useEditorial()
  const setOpen = useNlPopup((s) => s.setOpen)
  return (
    <button className="circ" type="button" aria-label={NL_LABEL[lang]} title={NL_LABEL[lang]} onClick={() => setOpen(true)}>
      <EIcon n="mail" s={16} />
    </button>
  )
}

/** Assistant trigger in the pill. Hidden ≤860px by `.circ-chat` (the pill
 *  runs out of room next to the lang segment) — the floating bubble and the
 *  menu entry cover phones. */
function ChatCirc() {
  const { lang } = useEditorial()
  const setOpen = useChatPanel((s) => s.setOpen)
  return (
    <button
      className="circ circ-chat"
      type="button"
      aria-label={CHAT_LABEL[lang]}
      title={CHAT_LABEL[lang]}
      onClick={() => setOpen(true)}
    >
      <EIcon n="chat" s={17} />
    </button>
  )
}

/** Assistant trigger inside the fullscreen menu's footer row. */
function ChatMenuLink({ onClose }: { onClose: () => void }) {
  const { lang } = useEditorial()
  const setOpen = useChatPanel((s) => s.setOpen)
  return (
    <a
      href="#chat"
      onClick={(e) => {
        e.preventDefault()
        onClose()
        setOpen(true)
      }}
    >
      {CHAT_LABEL[lang]}
    </a>
  )
}

/** Newsletter trigger inside the fullscreen menu's footer row. */
function NewsletterMenuLink({ onClose }: { onClose: () => void }) {
  const { lang } = useEditorial()
  const setOpen = useNlPopup((s) => s.setOpen)
  return (
    <a
      href="#newsletter"
      onClick={(e) => {
        e.preventDefault()
        onClose()
        setOpen(true)
      }}
    >
      {NL_LABEL[lang]}
    </a>
  )
}

export function PillNav({ onMenu }: { onMenu: () => void }) {
  const { t } = useEditorial()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const labels = NAV.map(([k]) => t(k))
  const { lab } = useChrome(labels)
  return (
    <nav className="pill" aria-label="Navigation principale">
      <div className="pill-in">
        {onHome ? (
          <a className="pill-logo" href="#accueil" aria-label="D-tech, accueil">
            dt
          </a>
        ) : (
          <Link className="pill-logo" href="/" aria-label="D-tech, accueil">
            dt
          </Link>
        )}
        <div className="pill-links">
          {NAV.map(([k, h, route]) =>
            onHome ? (
              <a key={k} href={h}>
                {t(k)}
              </a>
            ) : (
              <Link key={k} href={route}>
                {t(k)}
              </Link>
            )
          )}
        </div>
        <RollLabel text={lab} />
        <div className="pill-acts">
          <LangSeg />
          <a className="circ wa" href={WA} target="_blank" rel="noopener noreferrer" aria-label={t('aria.wa')}>
            <WaIcon />
          </a>
          <a className="circ" href={`tel:${ED_PHONE_TEL}`} aria-label={t('aria.call')}>
            <EIcon n="tel" s={17} />
          </a>
          <ChatCirc />
          <NewsletterCirc />
          <CartCirc />
          <button className="circ" onClick={onMenu} aria-label={t('aria.menu')}>
            <EIcon n="menu" s={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ─────────── fullscreen menu (design MenuOverlay) ─────────── */

export function MenuOverlay({
  onClose,
  previews = [],
}: {
  onClose: () => void
  previews?: (string | null)[]
}) {
  const { t } = useEditorial()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const [hov, setHov] = useState(0)
  const ref = useFocusTrap<HTMLDivElement>(true, onClose)
  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevOverflow
    }
  }, [])
  const prev = previews[hov] ?? null
  return (
    <div className="ov" role="dialog" aria-modal="true" aria-label={t('menu.title')} ref={ref}>
      <button className="ov-close" onClick={onClose} aria-label={t('aria.close')}>
        <EIcon n="close" s={18} />
      </button>
      <div className="ov-in">
        <div className="ov-body">
          <div className="ov-prev" aria-hidden>
            {prev ? (
              <Image src={prev} alt="" fill sizes="192px" style={{ objectFit: 'cover' }} />
            ) : (
              <span className="ed-slot">
                <i>
                  {t('menu.prev')} — {t(NAV[hov]?.[0] ?? 'nav.home')}
                </i>
              </span>
            )}
          </div>
          <div className="ov-nav">
            {NAV.map(([k, h, route], i) => (
              onHome ? (
                <a className="ov-item" key={k} href={h} onClick={onClose} onMouseEnter={() => setHov(i)}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="l">{t(k)}</span>
                </a>
              ) : (
                <Link className="ov-item" key={k} href={route} onClick={onClose} onMouseEnter={() => setHov(i)}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="l">{t(k)}</span>
                </Link>
              )
            ))}
          </div>
        </div>
        <div className="ov-foot">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={`mailto:${ED_EMAIL}`}>{ED_EMAIL}</a>
            <a href={`tel:${ED_PHONE_TEL}`}>{ED_PHONE_DISPLAY}</a>
            <ChatMenuLink onClose={onClose} />
            <NewsletterMenuLink onClose={onClose} />
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Language selection stays reachable on mobile, where the pill
                hides its inline controls behind this menu. */}
            <LangSeg />
            <a className="btn btn-k" href={WA} target="_blank" rel="noopener noreferrer">
              <WaIcon s={17} />
              {t('menu.wa')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Chrome bundle: cursor + pill + menu state. */
export function EditorialHeader({ previews }: { previews?: (string | null)[] }) {
  const [menu, setMenu] = useState(false)
  const openMenu = useCallback(() => setMenu(true), [])
  const closeMenu = useCallback(() => setMenu(false), [])
  return (
    <>
      <EdCursor />
      <PillNav onMenu={openMenu} />
      {menu && <MenuOverlay onClose={closeMenu} previews={previews} />}
    </>
  )
}

/* ─────────── footer (design EdFooter) ─────────── */

export function EditorialFooter({ catNames = [] }: { catNames?: { id: string; name: string }[] }) {
  const { t } = useEditorial()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const year = new Date().getFullYear()
  return (
    <div className="fwrap">
      <footer className="foot">
        <div className="foot-grid">
          <div>
            <div className="mark gmark">
              D-tech<span>.</span>
            </div>
            <p className="blurb">{t('foot.blurb')}</p>
            <div className="socials">
              <a href={onHome ? '#accueil' : '/'} aria-label="Site">
                <EIcon n="globe" s={16} />
              </a>
              <a href={`mailto:${ED_EMAIL}`} aria-label="E-mail">
                <EIcon n="mail" s={16} />
              </a>
              <a href={`tel:${ED_PHONE_TEL}`} aria-label={t('aria.call')}>
                <EIcon n="tel" s={16} />
              </a>
            </div>
          </div>
          <div>
            <h4>{t('foot.nav')}</h4>
            <ul>
              {NAV.map(([k, h, route]) => (
                <li key={k}>
                  {onHome ? <a href={h}>{t(k)}</a> : <Link href={route}>{t(k)}</Link>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{t('foot.cat')}</h4>
            <ul>
              {catNames.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/products?category=${c.id}`}>{c.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/legal">{t('foot.legal')}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>{t('foot.shop')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="row">
                <EIcon n="pin" s={16} />
                <span>{t('contact.addr')}</span>
              </div>
              <div className="row">
                <EIcon n="tel" s={16} />
                <a href={`tel:${ED_PHONE_TEL}`}>{ED_PHONE_DISPLAY}</a>
              </div>
              <div className="row">
                <EIcon n="wrench" s={16} />
                <a href={`tel:${ED_SAV_TEL}`}>SAV · {ED_SAV_DISPLAY}</a>
              </div>
              <div className="row">
                <EIcon n="mail" s={16} />
                <a href={`mailto:${ED_EMAIL}`}>{ED_EMAIL}</a>
              </div>
              <a
                className="btn btn-wa"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                href={WA}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WaIcon s={18} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="foot-bar">
          <span>
            © {year} dtech — Digital Technologie. {t('foot.rights')}
          </span>
          <span>{t('foot.place')}</span>
        </div>
      </footer>
    </div>
  )
}
