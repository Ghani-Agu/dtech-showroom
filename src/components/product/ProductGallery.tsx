'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'

const PREV: Record<string, string> = {
  fr: 'Image précédente',
  en: 'Previous image',
  ar: 'الصورة السابقة',
}
const NEXT: Record<string, string> = {
  fr: 'Image suivante',
  en: 'Next image',
  ar: 'الصورة التالية',
}

/**
 * Product gallery — the main product image with the photo-carousel images
 * merged in as clickable thumbnails (plus prev/next arrows). Shared by the
 * classic showroom and the Brand product pages: all colors come from the
 * --sr-* tokens, which adapt per design/theme (brand-root remaps them).
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const locale = useLocale()
  const list = [...new Set(images.filter(Boolean))]
  const [idx, setIdx] = useState(0)
  if (list.length === 0) return null
  const active = Math.min(idx, list.length - 1)
  const current = list[active]
  if (current === undefined) return null
  const go = (d: number) => setIdx((p) => (p + d + list.length) % list.length)

  return (
    <div className="pg-root">
      <div className="pg-main">
        <Image
          key={current}
          src={current}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 600px, 100vw"
          style={{ objectFit: 'cover' }}
          priority
        />
        {list.length > 1 && (
          <>
            <button type="button" className="pg-arrow prev" aria-label={PREV[locale] ?? PREV.fr} onClick={() => go(-1)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button type="button" className="pg-arrow next" aria-label={NEXT[locale] ?? NEXT.fr} onClick={() => go(1)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <span className="pg-count" dir="ltr">{active + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="pg-thumbs">
          {list.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`pg-thumb ${i === active ? 'on' : ''}`}
              aria-label={`${alt} — ${i + 1}`}
              aria-current={i === active || undefined}
              onClick={() => setIdx(i)}
            >
              <Image src={src} alt="" fill sizes="90px" priority={i === 0} style={{ objectFit: 'contain', padding: 4 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
