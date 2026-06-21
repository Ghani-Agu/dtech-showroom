'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCart, whatsappOrderUrl } from '@/lib/cart'

export function CartDrawer() {
  const t = useTranslations('showroom.cart')
  const { items, open, setOpen, setQty, remove, clear } = useCart()
  const count = items.reduce((a, i) => a + i.qty, 0)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <>
      <div className="sr-overlay" onClick={() => setOpen(false)} />
      <aside className="sr-drawer" role="dialog" aria-modal="true" aria-label={t('title')}>
        <div className="head">
          <strong style={{ fontSize: 17, letterSpacing: '-0.02em' }}>{t('title')}</strong>
          <span className="sr-mono">{t('count', { count })}</span>
          <button
            type="button"
            className="sr-icn"
            style={{ marginInlineStart: 'auto' }}
            aria-label={t('close')}
            onClick={() => setOpen(false)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="body">
          {items.length === 0 ? (
            <div className="sr-empty">{t('empty')}</div>
          ) : (
            items.map((i) => (
              <div className="sr-cart-item" key={i.slug}>
                <span className="thumb">
                  <Image src={i.image} alt="" fill sizes="64px" style={{ objectFit: 'cover' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="br">{i.brand}</div>
                  <div className="nm">{i.name}</div>
                </div>
                <span className="sr-qty">
                  <button type="button" aria-label={t('less')} onClick={() => setQty(i.slug, i.qty - 1)}>−</button>
                  <span className="q">{i.qty}</span>
                  <button type="button" aria-label={t('more')} onClick={() => setQty(i.slug, i.qty + 1)}>+</button>
                </span>
                <button
                  type="button"
                  className="sr-icn"
                  style={{ width: 30, height: 30 }}
                  aria-label={t('remove', { name: i.name })}
                  onClick={() => remove(i.slug)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 4v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
        <div className="foot">
          <p className="sr-mono" style={{ fontSize: 10, lineHeight: 1.6, textTransform: 'none', letterSpacing: '0.04em' }}>
            {t('note')}
          </p>
          <a
            className="sr-btn sr-btn-wa"
            style={{ justifyContent: 'center', pointerEvents: items.length ? 'auto' : 'none', opacity: items.length ? 1 : 0.45 }}
            href={whatsappOrderUrl(items, t('waIntro'))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.2 8.2 0 01-2.4-1.49 9 9 0 01-1.66-2.07c-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 1117.46-4.99 9.4 9.4 0 01-9.48 9.41zm8.03-17.43A11.32 11.32 0 0012.03.75C5.83.75.78 5.8.78 12a11.2 11.2 0 001.5 5.62L.69 23.25l5.77-1.51a11.27 11.27 0 005.57 1.47h.01c6.2 0 11.25-5.05 11.25-11.25 0-3.01-1.17-5.83-3.22-7.89z" />
            </svg>
            {t('orderWhatsApp')}
          </a>
          {items.length > 0 ? (
            <button type="button" className="sr-btn sr-btn-ghost" style={{ justifyContent: 'center' }} onClick={clear}>
              {t('clear')}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  )
}
