import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EyebrowLabelProps {
  children: ReactNode
  className?: string
}

export function EyebrowLabel({ children, className }: EyebrowLabelProps) {
  return (
    <p
      className={cn(
        'font-mono text-xs uppercase tracking-wider text-text-muted',
        className
      )}
    >
      {children}
    </p>
  )
}
