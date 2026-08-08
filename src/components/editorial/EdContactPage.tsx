'use client'

/**
 * ROUND 19 — /contact.
 *
 * Three things it has to do well:
 *  1. give a human a way to reach a human in one tap (call / WhatsApp / mail);
 *  2. state where the showroom actually is — the real registered address,
 *     Cité 1577 logements Bt 3 local DEFG, Bab Ezzouar;
 *  3. take a written request without bouncing the visitor to a product page.
 *
 * The map is CLICK-TO-LOAD on purpose. A Google Maps iframe is ~700 kB and
 * three third-party connections; on an Algerian mobile connection that is the
 * single most expensive thing on the page, and most visitors only want the
 * phone number. The placeholder is styled, keyboard-operable, and always
 * paired with a plain "open in Maps" link that needs no iframe at all.
 */

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useLocale } from 'next-intl'
import { useEditorial } from './editorial-context'
import { EIcon, WaIcon } from './editorial-icons'
import {
  ED_EMAIL,
  ED_PHONE_DISPLAY,
  ED_PHONE_TEL,
  ED_SAV_DISPLAY,
  ED_SAV_TEL,
  WA,
} from './EditorialChrome'
import { MAP_LINK, MAP_QUERY } from '@/lib/contact-info'
import { submitContact, type ContactActionResult } from '@/server/contact-actions'

/** Registered seat of SARL Hardware Technology Service (CACI directory). */
const MAP_Q = MAP_QUERY
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(MAP_Q)}&output=embed`

const SUBJECTS = ['quote', 'availability', 'support', 'partnership', 'other'] as const

/* ── Découpage en sections : chaque bloc est exporté séparément pour que
   l'éditeur web puisse les réordonner ou en masquer un individuellement. ── */

/** ── En-tête ── */
export function EdCtHead() {
  const { t } = useEditorial()

  return (
    <header className="edct-head rv">
      <span className="eyebrow">{t('ct.eyebrow')}</span>
      <h1 className="h2">{t('ct.title')}</h1>
      <p className="lede">{t('ct.lede')}</p>
    </header>
  )
}

/** ── Three ways to reach a human, in order of how fast they answer ── */
export function EdCtChannels() {
  const { t } = useEditorial()

  return (
    <div className="edct-chan rv">
      <a className="edct-card wa" href={WA} target="_blank" rel="noopener noreferrer">
        <span className="edct-ic">
          <WaIcon s={20} />
        </span>
        <b>WhatsApp</b>
        <i>{ED_PHONE_DISPLAY}</i>
        <span className="edct-go">{t('ct.wa')} →</span>
      </a>
      <a className="edct-card" href={`tel:${ED_PHONE_TEL}`}>
        <span className="edct-ic">
          <EIcon n="tel" s={19} />
        </span>
        <b>{t('ct.commercial')}</b>
        <i>{ED_PHONE_DISPLAY}</i>
        <span className="edct-go">{t('ct.hours')}</span>
      </a>
      <a className="edct-card" href={`tel:${ED_SAV_TEL}`}>
        <span className="edct-ic">
          <EIcon n="wrench" s={19} />
        </span>
        <b>{t('ct.sav')}</b>
        <i>{ED_SAV_DISPLAY}</i>
        <span className="edct-go">{t('ct.hours')}</span>
      </a>
      <a className="edct-card" href={`mailto:${ED_EMAIL}`}>
        <span className="edct-ic">
          <EIcon n="mail" s={19} />
        </span>
        <b>{t('ct.mail')}</b>
        <i>{ED_EMAIL}</i>
        <span className="edct-go">{t('ct.formLede')}</span>
      </a>
    </div>
  )
}

function MapPanel() {
  const { t } = useEditorial()
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="edct-map">
      {loaded ? (
        <iframe
          src={MAP_EMBED}
          title={MAP_Q}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button type="button" className="edct-mapph" onClick={() => setLoaded(true)}>
          <span className="edct-grid" aria-hidden />
          <span className="edct-pin" aria-hidden>
            <EIcon n="pin" s={22} />
          </span>
          <span className="edct-maplab">
            <b>{t('ct.maphint')}</b>
            <i>Bab Ezzouar · Alger</i>
          </span>
        </button>
      )}
    </div>
  )
}

/** ── Where we actually are ── */
export function EdCtLocation() {
  const { t } = useEditorial()

  return (
    <section className="edct-loc rv">
      <div className="edct-locinfo">
        <span className="eyebrow">{t('ct.showroom')}</span>
        <h2 className="edct-addr">{t('ct.addr')}</h2>
        <ul className="edct-facts">
          <li>
            <EIcon n="clock" s={17} />
            <span>
              <b>{t('ct.hoursLabel')}</b>
              {t('ct.hours')}
            </span>
          </li>
          <li>
            <EIcon n="tel" s={17} />
            <span>
              <b>{t('ct.phone')}</b>
              <a href={`tel:${ED_PHONE_TEL}`}>{ED_PHONE_DISPLAY}</a>
            </span>
          </li>
          <li>
            <EIcon n="mail" s={17} />
            <span>
              <b>{t('ct.mail')}</b>
              <a href={`mailto:${ED_EMAIL}`}>{ED_EMAIL}</a>
            </span>
          </li>
        </ul>
        <a className="btn btn-k" href={MAP_LINK} target="_blank" rel="noopener noreferrer">
          <EIcon n="pin" s={16} />
          {t('ct.dir')}
        </a>
        <p className="edct-legal">
          {t('ct.legal')} <span>{t('ct.since')}</span>
        </p>
      </div>
      <MapPanel />
    </section>
  )
}

function Submit() {
  const { t } = useEditorial()
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-k edct-submit" type="submit" disabled={pending}>
      {pending ? t('ct.f.sending') : t('ct.f.send')}
      {pending ? null : <b aria-hidden>→</b>}
    </button>
  )
}

/* ── Written request. `useActionState` et `Submit` restent ici : `useFormStatus`
   n'a d'état que sous le <form> qu'il observe. ── */
export function EdCtForm() {
  const { t } = useEditorial()
  const locale = useLocale()
  const [state, formAction] = useActionState<ContactActionResult, FormData>(
    submitContact,
    null
  )
  const err = state && state.ok === false ? state.errors : undefined

  return (
    <section className="edct-form rv" id="form">
      <div className="edct-formhead">
        <span className="eyebrow">{t('ct.formTitle')}</span>
        <h2 className="h2">{t('ct.f.h')}</h2>
        <p className="lede">{t('ct.formLede')}</p>
      </div>
      <form action={formAction} className="edct-fields">
        <input type="hidden" name="locale" value={locale} />
        {/* Honeypot — visually hidden, never announced, never tab-reachable. */}
        <div className="edct-hp" aria-hidden>
          <label htmlFor="ct-website">Website</label>
          <input id="ct-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="edct-subj" role="radiogroup" aria-label={t('ct.f.subject')}>
          {SUBJECTS.map((s, i) => (
            <label className="edct-pill" key={s}>
              <input type="radio" name="subject" value={s} defaultChecked={i === 0} required />
              <span>{t(`ct.s.${s}`)}</span>
            </label>
          ))}
        </div>

        <div className="edct-row">
          <label className="edct-f">
            <span>{t('ct.f.name')}</span>
            <input name="fullName" type="text" required minLength={2} maxLength={120} autoComplete="name" />
          </label>
          <label className="edct-f">
            <span>{t('ct.f.company')}</span>
            <input name="company" type="text" maxLength={120} autoComplete="organization" />
          </label>
        </div>
        <div className="edct-row">
          <label className="edct-f">
            <span>{t('ct.f.email')}</span>
            <input name="email" type="email" required maxLength={255} autoComplete="email" />
          </label>
          <label className="edct-f">
            <span>{t('ct.f.phone')}</span>
            <input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" />
          </label>
        </div>
        <label className="edct-f">
          <span>{t('ct.f.msg')}</span>
          <textarea name="message" required minLength={10} maxLength={5000} rows={5} />
        </label>

        {err ? (
          <p className="edct-err">{err._rate ? t('ct.f.rate') : t('ct.f.error')}</p>
        ) : null}
        <div className="edct-actions">
          <Submit />
          <a className="btn btn-wa" href={WA} target="_blank" rel="noopener noreferrer">
            <WaIcon s={17} />
            {t('ct.wa')}
          </a>
        </div>
      </form>
    </section>
  )
}

export function EdContactPage() {
  return (
    <div className="edct">
      <EdCtHead />
      <EdCtChannels />
      <EdCtLocation />
      <EdCtForm />
    </div>
  )
}
