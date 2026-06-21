'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, Search } from 'lucide-react'

type Status = 'all' | 'pending' | 'subscribed' | 'unsubscribed' | 'bounced'

const TABS: { id: Status; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'subscribed', label: 'Confirmés' },
  { id: 'pending', label: 'En attente' },
  { id: 'unsubscribed', label: 'Désinscrits' },
  { id: 'bounced', label: 'Rebonds' },
]

interface ToolbarProps {
  status: Status
  q: string
  counts: Record<Status, number>
}

export function SubscribersToolbar({ status, q, counts }: ToolbarProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setParam(name: string, value?: string) {
    const sp = new URLSearchParams(params.toString())
    if (!value) sp.delete(name)
    else sp.set(name, value)
    sp.delete('page')
    startTransition(() => {
      router.replace(`?${sp.toString()}`)
    })
  }

  function exportCsv() {
    const sp = new URLSearchParams()
    if (status !== 'all') sp.set('status', status)
    if (q) sp.set('q', q)
    const url = `/api/admin/subscribers/export?${sp.toString()}`
    window.location.href = url
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
          const active = status === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setParam('status', t.id === 'all' ? undefined : t.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-body text-sm transition-colors ${
                active
                  ? 'border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] bg-[color-mix(in_oklab,var(--c-mint)_10%,transparent)] text-[var(--admin-text-primary)]'
                  : 'border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)]'
              }`}
              aria-pressed={active}
            >
              {t.label}
              <span className="font-mono text-[10.5px] text-[var(--admin-text-tertiary)]">
                {counts[t.id] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label
          className="relative flex items-center"
          aria-label="Rechercher dans les abonnés"
        >
          <Search
            size={14}
            className="absolute left-3 text-[var(--admin-text-tertiary)]"
          />
          <input
            type="search"
            defaultValue={q}
            onChange={(e) => setParam('q', e.target.value || undefined)}
            placeholder="Email, source…"
            className="w-56 rounded-full border border-[var(--admin-glass-border)] bg-transparent py-1.5 pl-9 pr-4 font-body text-sm text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-tertiary)] focus:border-[var(--admin-glass-border-strong)]"
          />
        </label>
        <button
          type="button"
          onClick={exportCsv}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-glass-border)] px-3 py-1.5 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)]"
        >
          <Download size={14} /> Exporter CSV
        </button>
      </div>
    </div>
  )
}
