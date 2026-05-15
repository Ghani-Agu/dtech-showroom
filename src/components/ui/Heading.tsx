import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HeadingSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero'
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4'

interface HeadingProps {
  children: ReactNode
  as?: HeadingTag
  size?: HeadingSize
  accentChar?: string
  className?: string
}

const sizeClasses: Record<HeadingSize, string> = {
  sm: 'text-3xl tracking-snug',
  md: 'text-4xl md:text-5xl tracking-snug',
  lg: 'text-5xl md:text-6xl tracking-tight',
  xl: 'text-6xl md:text-7xl tracking-tight leading-tight',
  hero: 'text-7xl md:text-8xl lg:text-9xl tracking-tight leading-tight',
}

export function Heading({
  children,
  as: Tag = 'h2',
  size = 'lg',
  accentChar,
  className,
}: HeadingProps) {
  return (
    <Tag
      className={cn(
        'font-display font-medium text-text-primary',
        sizeClasses[size],
        className
      )}
    >
      {children}
      {accentChar ? <span className="text-accent">{accentChar}</span> : null}
    </Tag>
  )
}
