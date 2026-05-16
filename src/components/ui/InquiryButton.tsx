import type { ReactNode } from 'react'
import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils'

interface InquiryButtonProps {
  href: string
  children: ReactNode
  arrowChar?: string
  className?: string
}

export function InquiryButton({
  href,
  children,
  arrowChar = '→',
  className,
}: InquiryButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-baseline gap-2 font-body text-base text-text-primary transition-colors',
        className
      )}
    >
      <span className="border-b border-text-muted pb-0.5 transition-colors group-hover:border-accent">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="text-accent transition-transform duration-200 group-hover:translate-x-1"
      >
        {arrowChar}
      </span>
    </Link>
  )
}
