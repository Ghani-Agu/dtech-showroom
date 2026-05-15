import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: CardPadding
  as?: 'div' | 'article' | 'section'
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  padding = 'md',
  as: Tag = 'div',
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-md bg-surface-elevated',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </Tag>
  )
}
