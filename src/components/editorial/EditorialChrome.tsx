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
import { useScrollFx } from './ed-scroll'
import { useCart } from '@/lib/cart'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { EIcon, WaIcon } from './editorial-icons'
import { useNlPopup } from '@/lib/newsletter-popup'
import { useChatPanel } from '@/lib/chat-panel'
import { useNavData } from '@/components/layout/nav-data'
import { groupByFamily } from './ed-families'
import {
  CONTACT_EMAIL,
  PHONE_DISPLAY,
  PHONE_TEL,
  SAV_DISPLAY,
  SAV_TEL,
  WHATSAPP_URL,
} from '@/lib/contact-info'

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

/* Re-exported under the ED_* names the editorial components already import,
   but defined once in @/lib/contact-info — this file used to be a second
   source of truth for the phone numbers and mailbox. */
export const ED_PHONE_DISPLAY = PHONE_DISPLAY
export const ED_PHONE_TEL = PHONE_TEL
export const ED_SAV_DISPLAY = SAV_DISPLAY
export const ED_SAV_TEL = SAV_TEL
export const ED_EMAIL = CONTACT_EMAIL
export const WA = WHATSAPP_URL

/**
 * ROUND 19 — the nav is now SIX real destinations, everywhere.
 *
 * It used to be anchor links on the homepage and routes on inner pages, so
 * the same label scrolled on `/` and navigated on `/products`. Every entry is
 * a route now: one mental model, deep-linkable, shareable, indexable.
 * `mega: true` marks the entry that drops the category panel on hover.
 */
interface EdNavItem {
  key: string
  route: string
  mega?: boolean
}

const NAV: EdNavItem[] = [
  { key: 'nav.catalogue', route: '/catalogue', mega: true },
  { key: 'nav.products', route: '/products' },
  { key: 'nav.brands', route: '/brands' },
  { key: 'nav.gaming', route: '/gaming' },
  { key: 'nav.company', route: '/company' },
  { key: 'nav.contact', route: '/contact' },
]

/**
 * Homepage section anchors, used ONLY by the scroll-spy label in the pill.
 * Decoupled from NAV in round 19 — the nav no longer points at sections, but
 * the rolling label still tracks where you are on the long homepage.
 */
/* ROUND 21b — 'nav.ranges'/#gammes removed with the EdTiers section. */
const HOME_SPY: [string, string][] = [
  ['nav.home', '#accueil'],
  ['nav.catalogue', '#catalogue'],
  ['nav.brands', '#marques'],
  ['nav.why', '#pourquoi'],
  ['nav.contact', '#contact'],
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
    /* ROUND 21 — the trail eases toward the pointer, so once it has caught
       up there is nothing to animate. Parking the loop when it settles
       removes two transform writes (one of them on a blurred, fixed layer)
       from every single frame of every scroll. */
    const loop = () => {
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
      core.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(10deg)`
      trail.style.transform = `translate3d(${x}px,${y}px,0)`
      if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) {
        x = tx
        y = ty
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!raf) raf = requestAnimationFrame(loop)
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
  /* ROUND 21 — this ran on every scroll frame and was the second-biggest
     source of home-page jank after image decode (measured: 19 stalls >60ms
     and 1.9s of stall time down to 10 stalls / 1.15s by fixing the write
     alone). Three things were wrong:
       · `setAttribute('data-tone', …)` fired ~344 times per scroll-through
         even though the value changes maybe four times. Writing an
         attribute on `.editorial-root` invalidates style for every
         descendant matching one of the ~25 `[data-tone='dark'] …` rules —
         the whole chrome — on EVERY frame.
       · the `[data-band="dark"]` list and the six spy anchors were
         re-queried from the DOM on every frame.
       · reads and writes interleaved with the four other scroll listeners,
         so each read forced a synchronous layout.
     Now: elements cached, one read/write pass shared with everything else
     (ed-scroll.ts), and both the attribute and the React state only touched
     when the value actually changes. */
  const cache = useRef<{ bands: HTMLElement[]; spies: (Element | null)[] } | null>(null)
  const tone = useRef<'light' | 'dark' | ''>('')
  const labels = homeLabels.join('|')
  useEffect(() => {
    cache.current = null
    tone.current = ''
  }, [labels, rootRef])
  useScrollFx(
    () => {
      const root = rootRef.current
      if (!root) return null
      if (!cache.current || cache.current.bands.length === 0) {
        cache.current = {
          bands: Array.from(root.querySelectorAll<HTMLElement>('[data-band="dark"]')),
          spies: HOME_SPY.map(([, h]) => root.querySelector(h)),
        }
      }
      const y = 78
      let t: 'light' | 'dark' = 'light'
      for (const el of cache.current.bands) {
        const r = el.getBoundingClientRect()
        if (r.top <= y && r.bottom >= y) {
          t = 'dark'
          break
        }
      }
      let cur = homeLabels[0] ?? ''
      cache.current.spies.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= y + 60) cur = homeLabels[i] ?? cur
      })
      return { t, cur }
    },
    (v) => {
      if (!v) return
      if (tone.current !== v.t) {
        tone.current = v.t
        rootRef.current?.setAttribute('data-tone', v.t)
      }
      setLab((prev) => (prev === v.cur ? prev : v.cur))
    },
  )
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
  /* `circ-nl`: the PHONE PASS hides this one ≤620px — five 40px circles left
     the pill's section label ~55px. The pop-up opens itself and the same
     form is in the menu overlay and the footer. */
  return (
    <button className="circ circ-nl" type="button" aria-label={NL_LABEL[lang]} title={NL_LABEL[lang]} onClick={() => setOpen(true)}>
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

/* ─────────── Catalogue mega-menu (ROUND 19) ─────────── */

/**
 * Hover-to-open category panel hanging off the Catalogue nav item.
 *
 * Rules it has to respect:
 *  - the link itself STILL navigates to /catalogue on click — the panel is
 *    additive, never a trap;
 *  - keyboard users get it on focus-within, and Escape closes it;
 *  - touch devices never see it (no hover), they just navigate;
 *  - closing is delayed ~160 ms so the diagonal mouse travel from the label
 *    down into the panel doesn't dismiss it mid-move.
 */
function CatalogueMega({
  open,
  onNavigate,
}: {
  open: boolean
  onNavigate: () => void
}) {
  const { t } = useEditorial()
  const { cats, productCount } = useNavData()
  const groups = groupByFamily(cats)

  return (
    <div className={`mega${open ? ' on' : ''}`} id="ed-mega" aria-hidden={!open}>
      {/* data-lenis-prevent: ScrollProvider runs Lenis with smoothWheel and
          allowNestedScroll:false, so without this opt-out Lenis swallows the
          wheel event and scrolls the PAGE instead of this panel — on a 768px
          laptop the panel is taller than its max-height and the footer row
          would be unreachable by mouse. */}
      <div className="mega-in" data-lenis-prevent>
        <div className="mega-head">
          <div>
            <span className="mega-k">{t('mega.title')}</span>
            <p>{t('mega.lede')}</p>
          </div>
          <Link className="mega-all" href="/catalogue" onClick={onNavigate} tabIndex={open ? 0 : -1}>
            {t('mega.all')}
            <b aria-hidden>→</b>
          </Link>
        </div>
        <div className="mega-grid">
          {groups.map(({ family, cats: fc }) => (
            <div
              className="mega-col"
              key={family.id}
              style={{ ['--h' as string]: String(family.hue) }}
            >
              <h4>{t(`fam.${family.id}`)}</h4>
              <ul>
                {fc.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/products?category=${c.slug}`}
                      onClick={onNavigate}
                      tabIndex={open ? 0 : -1}
                    >
                      <span>{c.name}</span>
                      <i>{c.count}</i>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mega-foot">
          <span>
            {productCount} {t('cpage.refs')}
          </span>
          <Link href="/gaming" onClick={onNavigate} tabIndex={open ? 0 : -1}>
            {t('nav.gaming')} <b aria-hidden>→</b>
          </Link>
          <Link href="/brands" onClick={onNavigate} tabIndex={open ? 0 : -1}>
            {t('nav.brands')} <b aria-hidden>→</b>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PillNav({ onMenu }: { onMenu: () => void }) {
  const { t } = useEditorial()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const spyLabels = HOME_SPY.map(([k]) => t(k))
  const { lab } = useChrome(spyLabels)

  /* Mega-menu open state, with the close delay described above. */
  const [mega, setMega] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const openMega = useCallback(() => {
    cancelClose()
    setMega(true)
  }, [cancelClose])
  const closeMega = useCallback(
    (immediate = false) => {
      cancelClose()
      if (immediate) setMega(false)
      else closeTimer.current = setTimeout(() => setMega(false), 160)
    },
    [cancelClose]
  )
  useEffect(() => () => cancelClose(), [cancelClose])
  /* Route change (including a click inside the panel) always dismisses it. */
  useEffect(() => {
    setMega(false)
  }, [pathname])
  /**
   * Dismissal paths that hover alone does not cover.
   *
   *  - Escape, obviously.
   *  - focusin ANYWHERE outside the pill: a keyboard user who opens the panel
   *    with focus and then tabs onward would otherwise leave a 960×560 panel
   *    sitting over the page with pointer-events on, with nothing left in the
   *    tab order able to close it.
   *  - pointerdown outside: the safety net for hybrid touch/trackpad laptops,
   *    where a tap synthesises mouseenter but never a mouseleave.
   */
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!mega) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMega(false)
    }
    const outside = (e: Event) => {
      const t = e.target as Node | null
      if (t && navRef.current && !navRef.current.contains(t)) setMega(false)
    }
    addEventListener('keydown', onKey)
    document.addEventListener('focusin', outside)
    document.addEventListener('pointerdown', outside)
    return () => {
      removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('pointerdown', outside)
    }
  }, [mega])

  return (
    <nav
      className="pill"
      aria-label="Navigation principale"
      ref={navRef}
      onMouseLeave={() => closeMega()}
    >
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
          {NAV.map((item) => {
            const active = pathname === item.route || pathname.startsWith(item.route + '/')
            return (
              <Link
                key={item.key}
                href={item.route}
                aria-current={active ? 'page' : undefined}
                className={
                  (active ? 'on' : '') + (item.mega ? ' has-mega' : '')
                }
                {...(item.mega
                  ? {
                      onMouseEnter: openMega,
                      onFocus: openMega,
                      'aria-expanded': mega,
                      'aria-controls': 'ed-mega',
                    }
                  : { onMouseEnter: () => closeMega(true) })}
              >
                {t(item.key)}
                {item.mega ? <b className="cav" aria-hidden /> : null}
              </Link>
            )
          })}
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
      <div
        className="mega-wrap"
        onMouseEnter={openMega}
        onMouseLeave={() => closeMega()}
      >
        <CatalogueMega open={mega} onNavigate={() => closeMega(true)} />
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
                  {t('menu.prev')} — {t(NAV[hov]?.key ?? 'nav.home')}
                </i>
              </span>
            )}
          </div>
          <div className="ov-nav">
            {NAV.map((item, i) => (
              <Link
                className="ov-item"
                key={item.key}
                href={item.route}
                onClick={onClose}
                onMouseEnter={() => setHov(i)}
              >
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span className="l">{t(item.key)}</span>
              </Link>
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
  /* ROUND 19: the homepage passes catNames explicitly; every OTHER route used
     to render an empty category column because nothing threaded them down.
     The nav context now backfills it, so the footer is complete site-wide. */
  const nav = useNavData()
  const cats = catNames.length
    ? catNames
    : nav.cats.slice(0, 6).map((c) => ({ id: c.slug, name: c.name }))
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
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link href={item.route}>{t(item.key)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{t('foot.cat')}</h4>
            <ul>
              {cats.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/products?category=${c.id}`}>{c.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/catalogue">{t('cpage.all')}</Link>
              </li>
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
