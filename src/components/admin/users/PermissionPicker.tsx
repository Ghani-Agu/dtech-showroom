'use client'

import { Check } from 'lucide-react'
import { SECTIONS } from '@/lib/permissions'

const PICKABLE = SECTIONS.filter((s) => s.key !== 'users')

/** Colored toggle cards — which admin sections a staff member can manage. */
export function PermissionPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  function toggle(key: string) {
    onChange(
      value.includes(key) ? value.filter((k) => k !== key) : [...value, key]
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {PICKABLE.map((s) => {
        const on = value.includes(s.key)
        return (
          <button
            key={s.key}
            type="button"
            disabled={disabled}
            onClick={() => toggle(s.key)}
            aria-pressed={on}
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: on
                ? `color-mix(in oklab, ${s.color} 50%, transparent)`
                : 'var(--admin-glass-border)',
              background: on
                ? `color-mix(in oklab, ${s.color} 9%, transparent)`
                : 'var(--admin-soft)',
            }}
          >
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-md border"
              style={
                on
                  ? {
                      background: s.color,
                      borderColor: s.color,
                      color: 'var(--admin-on-accent)',
                    }
                  : { borderColor: 'var(--admin-glass-border-strong)', color: 'transparent' }
              }
            >
              <Check size={12} strokeWidth={3.5} />
            </span>
            <span className="min-w-0">
              <span
                className="block font-body text-[13.5px] font-semibold"
                style={{ color: on ? s.color : 'var(--admin-text-primary)' }}
              >
                {s.label}
              </span>
              <span
                className="block truncate font-body text-[11.5px]"
                style={{ color: 'var(--admin-text-tertiary)' }}
              >
                {s.desc}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
