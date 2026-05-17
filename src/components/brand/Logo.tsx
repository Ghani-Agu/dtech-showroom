import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
  priority?: boolean
}

const SIZE_MAP = {
  sm: { width: 28, height: 28, className: 'h-7 w-7' },
  md: { width: 48, height: 48, className: 'h-12 w-12' },
  lg: { width: 80, height: 80, className: 'h-20 w-20' },
} as const

export function Logo({
  size = 'sm',
  className,
  alt = 'Dtech',
  priority = false,
}: LogoProps) {
  const { width, height, className: sizeClass } = SIZE_MAP[size]

  return (
    <Image
      src="/dtech.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn(sizeClass, 'object-contain', className)}
    />
  )
}
