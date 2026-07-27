'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCart, whatsappOrderUrl } from '@/lib/cart'

export function ProductActions({
  slug,
  name,
  brand,
  image,
}: {
  slug: string
  name: string
  brand: string
  image: string
}) {
  const t = useTranslations('showroom.product')
  const add = useCart((s) => s.add)
  const setOpen = useCart((s) => s.setOpen)
  const [toast, setToast] = useState(false)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <button
        type="button"
        className="sr-btn sr-btn-primary"
        onClick={() => {
          add({ slug, name, brand, image })
          setOpen(true)
          setToast(true)
          window.setTimeout(() => setToast(false), 1800)
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
          <path d="M12 11v6M9 14h6" />
        </svg>
        {t('addToCart')}
      </button>
      <a
        className="sr-btn sr-btn-wa"
        href={whatsappOrderUrl([{ name, qty: 1 }], t('waProduct'))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07a8.2 8.2 0 01-2.4-1.49 9 9 0 01-1.66-2.07c-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36a9.42 9.42 0 1117.46-4.99 9.4 9.4 0 01-9.48 9.41zm8.03-17.43A11.32 11.32 0 0012.03.75C5.83.75.78 5.8.78 12a11.2 11.2 0 001.5 5.62L.69 23.25l5.77-1.51a11.27 11.27 0 005.57 1.47h.01c6.2 0 11.25-5.05 11.25-11.25 0-3.01-1.17-5.83-3.22-7.89z" />
        </svg>
        {t('orderWhatsApp')}
      </a>
      {toast ? <span className="sr-toast">{t('added')} ✓</span> : null}
    </div>
  )
}
