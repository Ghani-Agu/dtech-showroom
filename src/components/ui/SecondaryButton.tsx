import type { ReactNode, ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type CommonProps = {
  children: ReactNode
  className?: string
}

type AsLinkProps = CommonProps & {
  as?: 'link'
  href: string
}

type AsButtonProps = CommonProps & {
  as: 'button'
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  disabled?: boolean
  formAction?: ButtonHTMLAttributes<HTMLButtonElement>['formAction']
}

type SecondaryButtonProps = AsLinkProps | AsButtonProps

const baseClasses =
  'inline-flex items-center justify-center rounded-full border border-text-muted px-6 py-3 font-body text-base text-text-primary transition-colors hover:border-text-secondary hover:bg-surface-elevated/50 disabled:cursor-not-allowed disabled:opacity-50'

export function SecondaryButton(props: SecondaryButtonProps) {
  if (props.as === 'button') {
    const { children, className, type = 'button', disabled, formAction } = props
    return (
      <button
        type={type}
        disabled={disabled}
        formAction={formAction}
        className={cn(baseClasses, className)}
      >
        {children}
      </button>
    )
  }
  const { children, className, href } = props
  return (
    <Link href={href} className={cn(baseClasses, className)}>
      {children}
    </Link>
  )
}
