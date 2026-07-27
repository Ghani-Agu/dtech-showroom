'use client'

/**
 * NewsletterPopup (ROUND 16) — the ONLY customer-facing capture surface:
 * visitors subscribe to receive offers/discounts by e-mail; there are no
 * storefront accounts and no path into the back-office.
 *
 * One modal for all three skins, mounted once in the [locale] layout
 * (OUTSIDE .sr-root / .brand-root / .editorial-root — it carries its own
 * palette, so no skin reset or token remap can touch it). Header buttons
 * in each chrome open it through the useNlPopup store.
 *
 * Behaviour:
 *  - auto-opens ONCE per visitor: first of ~7 s on page or >600 px scroll;
 *  - closing snoozes it for 7 days (localStorage `dt-nlpop`);
 *  - a successful subscribe (or "already subscribed") disables auto-open
 *    forever — header buttons still reopen it manually;
 *  - never auto-opens on /newsletter/* (confirm & unsubscribe pages).
 *
 * Backend: the SAME double-opt-in subscribeAction as the footer form
 * (honeypot, rate limit, Brevo sync on confirm) with source='popup'.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/routing'
import { useNlPopup } from '@/lib/newsletter-popup'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  subscribeAction,
  type NewsletterActionResult,
} from '@/server/newsletter-actions'

const LS_KEY = 'dt-nlpop'
const SNOOZE_MS = 7 * 24 * 3600 * 1000

interface PopMemory {
  done?: boolean
  until?: number
}

function readMemory(): PopMemory {
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? '{}') as PopMemory
  } catch {
    return {}
  }
}

function writeMemory(m: PopMemory): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(m))
  } catch {
    /* private mode */
  }
}

function GiftArt() {
  return (
    <svg className="np-gift" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="24" width="48" height="34" rx="4" />
      <path d="M8 34h48" opacity=".4" />
      <path d="M32 24v34" />
      <path d="M32 24c-9 0-13-4.5-13-9a5.5 5.5 0 0 1 11-1c.9 3 2 7 2 10zm0 0c9 0 13-4.5 13-9a5.5 5.5 0 0 0-11-1c-.9 3-2 7-2 10z" />
    </svg>
  )
}

function SubmitBtn({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="np-cta" disabled={pending}>
      {pending ? busy : label}
    </button>
  )
}

export function NewsletterPopup() {
  const t = useTranslations('nlPopup')
  const locale = useLocale()
  const pathname = usePathname()
  const open = useNlPopup((s) => s.open)
  const setOpen = useNlPopup((s) => s.setOpen)
  const [state, formAction] = useActionState<NewsletterActionResult | null, FormData>(
    subscribeAction,
    null
  )
  const autoArmed = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    const m = readMemory()
    if (!m.done) writeMemory({ ...m, until: Date.now() + SNOOZE_MS })
  }, [setOpen])

  const succeeded = state?.ok === true
  useEffect(() => {
    if (succeeded) writeMemory({ done: true })
  }, [succeeded])

  // Auto-open — armed once per full page load, eligible visitors only.
  useEffect(() => {
    if (autoArmed.current) return
    autoArmed.current = true
    if (pathname.startsWith('/newsletter')) return
    const m = readMemory()
    if (m.done) return
    if (m.until && Date.now() < m.until) return

    let fired = false
    let timer = 0
    const onScroll = () => {
      if (window.scrollY > 600) fire()
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
    const fire = () => {
      if (fired) return
      fired = true
      cleanup()
      setOpen(true)
    }
    timer = window.setTimeout(fire, 7000)
    window.addEventListener('scroll', onScroll, { passive: true })
    return cleanup
  }, [pathname, setOpen])

  const trapRef = useFocusTrap<HTMLDivElement>(open, close)
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const already = state?.ok === true && state.status === 'already_subscribed'
  let errText: string | null = null
  if (state && !state.ok) {
    const code = state.errors?.email?.[0] ?? state.errors?._form?.[0] ?? 'generic'
    errText =
      code === 'invalid_email'
        ? t('errInvalid')
        : code === 'rate_limited'
          ? t('errRateLimited')
          : t('errGeneric')
  }

  return (
    <div
      className="sr-nlpop"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div ref={trapRef} className="np-card" role="dialog" aria-modal="true" aria-label={t('title')}>
        <button type="button" className="np-x" aria-label={t('close')} onClick={close}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* decorative pane */}
        <div className="np-visual" aria-hidden="true">
          <div className="np-mark">
            D-Tech<span>.</span>
          </div>
          <GiftArt />
          <span className="np-chip c1">−%</span>
          <span className="np-chip c2">PROMO</span>
          <span className="np-chip c3">FLASH</span>
          <p className="np-vtag">{t('visualTag')}</p>
        </div>

        {/* content pane */}
        <div className="np-body">
          {succeeded ? (
            <div className="np-done">
              <span className="np-check" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <p className="np-done-title">{already ? t('alreadyTitle') : t('okTitle')}</p>
              <p className="np-done-sub">{already ? t('alreadySub') : t('okSub')}</p>
              <button type="button" className="np-cta np-cta-done" onClick={() => setOpen(false)}>
                {t('doneBtn')}
              </button>
            </div>
          ) : (
            <>
              <p className="np-kicker">{t('kicker')}</p>
              <h3 className="np-title">{t('title')}</h3>
              <p className="np-sub">{t('sub')}</p>
              <ul className="np-points">
                <li>{t('point1')}</li>
                <li>{t('point2')}</li>
                <li>{t('point3')}</li>
              </ul>
              <form action={formAction} noValidate>
                {/* Honeypot — clipped in place (no offset: RTL scrollbar bug). */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <label htmlFor="np-hp">Website</label>
                  <input type="text" name="website" id="np-hp" tabIndex={-1} autoComplete="off" />
                </div>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="source" value="popup" />
                <div className="np-row">
                  <label htmlFor="np-email" className="sr-only">
                    {t('emailPh')}
                  </label>
                  <input
                    id="np-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    placeholder={t('emailPh')}
                    className="np-input"
                    dir="ltr"
                  />
                  <SubmitBtn label={t('cta')} busy={t('ctaBusy')} />
                </div>
                {errText ? (
                  <p role="alert" className="np-err">
                    {errText}
                  </p>
                ) : null}
              </form>
              <p className="np-micro">{t('micro')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
