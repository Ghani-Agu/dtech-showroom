'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

export type FallbackVariant = 'product' | 'brand' | 'category'

interface SmartImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string | null | undefined
  alt: string
  fallbackVariant?: FallbackVariant
}

const FALLBACK_SVG: Record<FallbackVariant, string> = {
  product: '/images/placeholders/product-placeholder.svg',
  brand: '/images/placeholders/brand-placeholder.svg',
  category: '/images/placeholders/category-placeholder.svg',
}

function SmartImage({
  src,
  alt,
  fallbackVariant = 'product',
  ...rest
}: SmartImageProps) {
  const [errored, setErrored] = useState(false)

  const finalSrc = !src || errored ? FALLBACK_SVG[fallbackVariant] : src

  return (
    <Image
      {...rest}
      src={finalSrc}
      alt={alt}
      onError={() => setErrored(true)}
    />
  )
}

export { SmartImage }
export default SmartImage
