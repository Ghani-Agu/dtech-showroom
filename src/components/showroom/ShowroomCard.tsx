'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useCart } from '@/lib/cart'
import { seededRating } from '@/lib/reviews'
import { Stars } from './Stars'

export interface ShowroomProduct {
  slug: string
  name: string
  brandName: string
  categoryName: string
  cardSpec: string
  cardImagePath: string
}

export function ShowroomCard({
  product,
  index = 0,
  priority = false,
}: {
  product: ShowroomProduct
  index?: number
  priority?: boolean
}) {
  const t = useTranslations('showroom')
  const tCat = useTranslations('showcase.catalog')
  const add = useCart((s) => s.add)
  const setOpen = useCart((s) => s.setOpen)
  const [added, setAdded] = useState(false)
  const rating = seededRating(product.slug)

  return (
    <article
      className="sr-card"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="cover"
        aria-label={product.name}
      />
      <div className="imgbox">
        <span className="brand-tag">{product.brandName}</span>
        <Image
          src={product.cardImagePath}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
          priority={priority}
        />
      </div>
      <div className="info">
        <span className="cat">{product.categoryName}</span>
        <h3 className="name">{product.name}</h3>
        <p className="spec" dir="ltr">{product.cardSpec}</p>
        <div className="meta">
          <Stars value={rating.avg} count={rating.count} />
        </div>
        <button
          type="button"
          className={added ? 'sr-cartbtn added' : 'sr-cartbtn'}
          aria-label={t('cart.add')}
          onClick={() => {
            add({
              slug: product.slug,
              name: product.name,
              brand: product.brandName,
              image: product.cardImagePath,
            })
            setAdded(true)
            window.setTimeout(() => {
              setAdded(false)
              setOpen(true)
            }, 650)
          }}
        >
          {added ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l5 5L20 6" />
              </svg>
              {tCat('added')}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2" />
              </svg>
              {tCat('addToCart')}
            </>
          )}
        </button>
      </div>
    </article>
  )
}
