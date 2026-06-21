import type { CampaignStatus } from '@/db/schema'

const VARIANTS: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  draft: {
    label: 'Brouillon',
    color: 'var(--admin-text-secondary)',
    bg: 'var(--admin-soft-2)',
  },
  scheduled: {
    label: 'Programmée',
    color: 'var(--c-blue)',
    bg: 'color-mix(in oklab, var(--c-blue) 12%, transparent)',
  },
  sending: {
    label: 'Envoi…',
    color: 'var(--c-amber)',
    bg: 'color-mix(in oklab, var(--c-amber) 14%, transparent)',
  },
  sent: {
    label: 'Envoyée',
    color: 'var(--c-emerald-text)',
    bg: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)',
  },
  failed: {
    label: 'Échec',
    color: 'var(--c-rose)',
    bg: 'color-mix(in oklab, var(--c-rose) 12%, transparent)',
  },
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const v = VARIANTS[status]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider"
      style={{ background: v.bg, color: v.color }}
    >
      {v.label}
    </span>
  )
}
