import type { Subscriber } from '@/db/schema'

const STATUS_TAGS: Record<
  Subscriber['status'],
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: 'En attente',
    color: 'var(--c-amber)',
    bg: 'color-mix(in oklab, var(--c-amber) 10%, transparent)',
  },
  subscribed: {
    label: 'Confirmé',
    color: 'var(--c-emerald-text)',
    bg: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)',
  },
  unsubscribed: {
    label: 'Désinscrit',
    color: 'var(--admin-text-tertiary)',
    bg: 'var(--admin-soft-2)',
  },
  bounced: {
    label: 'Rebond',
    color: 'var(--c-rose)',
    bg: 'color-mix(in oklab, var(--c-rose) 10%, transparent)',
  },
}

export function SubscriberRow({ row }: { row: Subscriber }) {
  const tag = STATUS_TAGS[row.status]
  const when = new Date(row.createdAt)
  return (
    <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[1fr_180px_140px_120px] md:items-center">
      <div className="min-w-0">
        <div className="truncate font-body text-[14px] font-semibold text-[var(--admin-text-primary)]">
          {row.email}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          {row.locale.toUpperCase()} · {row.source ?? 'inconnu'}
        </div>
      </div>
      <div
        className="font-mono text-[11.5px] text-[var(--admin-text-tertiary)]"
        title={when.toISOString()}
      >
        {when.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </div>
      <div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider"
          style={{ background: tag.bg, color: tag.color }}
        >
          {tag.label}
        </span>
      </div>
      <div className="font-mono text-[11px] text-[var(--admin-text-tertiary)] md:text-right">
        {row.confirmedAt
          ? `confirmé ${new Date(row.confirmedAt).toLocaleDateString('fr-FR')}`
          : row.unsubscribedAt
            ? `parti ${new Date(row.unsubscribedAt).toLocaleDateString('fr-FR')}`
            : '—'}
      </div>
    </div>
  )
}
