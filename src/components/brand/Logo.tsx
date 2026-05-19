import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  alt?: string
  priority?: boolean
}

const SIZE_MAP = {
  sm: { width: 40, height: 40, className: 'h-10 w-10' },
  md: { width: 64, height: 64, className: 'h-16 w-16' },
  lg: { width: 120, height: 120, className: 'h-[120px] w-[120px]' },
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
