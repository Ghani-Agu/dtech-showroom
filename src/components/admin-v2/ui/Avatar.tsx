import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_STYLES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-admin-accent-soft text-admin-accent flex items-center justify-center font-medium font-mono shrink-0',
        SIZE_STYLES[size],
        className
      )}
      aria-hidden="true"
    >
      {getInitials(name) || '?'}
    </div>
  )
}
