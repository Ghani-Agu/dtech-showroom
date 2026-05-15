'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { Placeholder } from './Placeholder'
import { cn } from '@/lib/utils'

type PlaceholderKind =
  | 'product-card'
  | 'product-hero'
  | 'brand-hero'
  | 'category-hero'

type SmartImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string | null | undefined
  alt: string
  placeholderKind: PlaceholderKind
  wrapperClassName?: string
}

export function SmartImage({
  src,
  alt,
  placeholderKind,
  wrapperClassName,
  className,
  ...rest
}: SmartImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={cn('relative h-full w-full', wrapperClassName)}>
        <Placeholder kind={placeholderKind} />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
