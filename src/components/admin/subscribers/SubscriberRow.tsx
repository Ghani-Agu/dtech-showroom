'use client'

/**
 * One row of the Abonnés list.
 *
 * ROUND 24 — was a pure display row. A `pending` subscriber is invisible to
 * everything downstream (campaigns target `subscribed` only), so when the
 * confirmation email fails to reach someone the address is stuck for good.
 * Pending rows now carry the two ways out: send the confirmation again, or
 * confirm the address here.
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Subscriber } from '@/db/schema'
import {
  confirmSubscriberAction,
  resendConfirmationAction,
} from '@/server/newsletter-actions'

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

const BTN =
  'rounded-full border border-[var(--admin-glass-border)] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-secondary)] transition-colors hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)] disabled:opacity-40'

export function SubscriberRow({ row }: { row: Subscriber }) {
  const tag = STATUS_TAGS[row.status]
  const when = new Date(row.createdAt)
  const [pending, start] = useTransition()
  /* The server revalidates the page, but the row should stop offering the
     buttons the moment the action succeeds. */
  const [done, setDone] = useState(false)
  const canAct = (row.status === 'pending' || row.status === 'bounced') && !done

  function run(
    fn: (id: string) => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    start(async () => {
      const r = await fn(row.id)
      if (r.ok) {
        setDone(true)
        toast.success(okMsg)
      } else {
        toast.error(r.error ?? 'Échec')
      }
    })
  }

  const shown = done ? STATUS_TAGS.subscribed : tag

  return (
    <div className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[1fr_150px_120px_190px] md:items-center">
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
          style={{ background: shown.bg, color: shown.color }}
        >
          {shown.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {canAct ? (
          <>
            <button
              type="button"
              className={BTN}
              disabled={pending}
              onClick={() => run(resendConfirmationAction, 'Confirmation renvoyée')}
              title="Renvoyer l’e-mail de confirmation à cette adresse"
            >
              Renvoyer
            </button>
            <button
              type="button"
              className={BTN}
              disabled={pending}
              onClick={() =>
                run(confirmSubscriberAction, 'Abonné confirmé — il recevra les campagnes')
              }
              title="Confirmer cette adresse sans attendre le clic du visiteur"
            >
              Confirmer
            </button>
          </>
        ) : (
          <span className="font-mono text-[11px] text-[var(--admin-text-tertiary)]">
            {done
              ? 'confirmé à l’instant'
              : row.confirmedAt
                ? `confirmé ${new Date(row.confirmedAt).toLocaleDateString('fr-FR')}`
                : row.unsubscribedAt
                  ? `parti ${new Date(row.unsubscribedAt).toLocaleDateString('fr-FR')}`
                  : '—'}
          </span>
        )}
      </div>
    </div>
  )
}
