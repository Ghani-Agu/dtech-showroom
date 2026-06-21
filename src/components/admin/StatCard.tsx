import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatAccent =
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'orange'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'pink'

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent: StatAccent
  href?: string
  /** Optional hint shown below the number, e.g. "8 en vedette". */
  hint?: string
  /** Shows the green "En direct" pill (data straight from the DB). */
  live?: boolean
}

const ACCENT_VAR: Record<StatAccent, string> = {
  cyan: 'var(--admin-cyan)',
  blue: 'var(--admin-blue)',
  violet: 'var(--admin-violet)',
  orange: 'var(--admin-orange)',
  amber: 'var(--admin-amber)',
  rose: 'var(--admin-rose)',
  purple: 'var(--admin-purple)',
  pink: 'var(--admin-pink)',
}

const ACCENT_GLOW: Record<StatAccent, string> = {
  cyan: 'color-mix(in oklab, var(--c-mint) 35%, transparent)',
  blue: 'color-mix(in oklab, var(--c-blue) 35%, transparent)',
  violet: 'color-mix(in oklab, var(--c-violet) 35%, transparent)',
  orange: 'color-mix(in oklab, var(--c-orange) 35%, transparent)',
  amber: 'color-mix(in oklab, var(--c-amber) 35%, transparent)',
  rose: 'color-mix(in oklab, var(--c-rose) 35%, transparent)',
  purple: 'color-mix(in oklab, var(--c-violet) 35%, transparent)',
  pink: 'color-mix(in oklab, var(--c-rose) 35%, transparent)',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
  hint,
  live = false,
}: StatCardProps) {
  const accentColor = ACCENT_VAR[accent]
  const accentGlow = ACCENT_GLOW[accent]

  const inner = (
    <div
      className={cn(
        'glass-surface group relative flex h-full flex-col p-6',
        'transition-[transform,box-shadow,border-color] duration-300 ease-[var(--admin-ease)]',
        'hover:-translate-y-1 hover:shadow-[0_0_32px_-8px_var(--accent-glow)]',
        'focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)] focus-visible:outline-none'
      )}
      style={
        {
          ['--accent-glow' as string]: accentGlow,
        } as React.CSSProperties
      }
    >
      {/* Label + icon chip (screenshot layout: label left, icon right) */}
      <div className="flex items-start justify-between gap-3">
        <p
          className="font-mono text-[11px] uppercase leading-relaxed"
          style={{
            color: 'var(--admin-text-secondary)',
            letterSpacing: '2px',
          }}
        >
          {label}
        </p>
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl transition-shadow duration-300 group-hover:shadow-[0_0_18px_-2px_var(--accent-glow)]"
          style={{
            background: `color-mix(in oklab, ${accentColor} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${accentColor} 35%, transparent)`,
            color: accentColor,
          }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
      </div>

      {/* Number */}
      <p
        className="mt-3 font-display text-[40px] font-light leading-none tracking-tight text-white"
        style={{ animation: 'admin-count-up 0.6s var(--admin-ease) both' }}
      >
        {value}
      </p>

      {/* Footer — hint + live pill */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p
          className="font-body text-xs"
          style={{ color: 'var(--admin-text-tertiary)' }}
        >
          {hint ?? ' '}
        </p>
        {live && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold"
            style={{
              background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--c-emerald) 35%, transparent)',
              color: 'var(--c-emerald-text)',
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background: 'var(--c-emerald)',
                boxShadow: '0 0 6px color-mix(in oklab, var(--c-emerald) 90%, transparent)',
                animation: 'admin-pulse-dot 2s ease-in-out infinite',
              }}
            />
            En direct
          </span>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    )
  }
  return inner
}
