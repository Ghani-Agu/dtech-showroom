'use client'

import { useState, useTransition } from 'react'
import { updateInquiryStatus } from '@/server/admin-inquiry-actions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface InquiryStatusControlProps {
  inquiryId: string
  currentStatus: 'new' | 'contacted' | 'closed' | 'spam'
}

const statuses = [
  { value: 'new', label: 'Nouvelle' },
  { value: 'contacted', label: 'Contactée' },
  { value: 'closed', label: 'Clôturée' },
  { value: 'spam', label: 'Indésirable' },
] as const

type Status = (typeof statuses)[number]['value']

export function InquiryStatusControl({
  inquiryId,
  currentStatus,
}: InquiryStatusControlProps) {
  const [status, setStatus] = useState<Status>(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleChange(newStatus: Status) {
    if (newStatus === status) return

    const previous = status
    setStatus(newStatus)

    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, newStatus)

      if (!result.ok) {
        setStatus(previous)
        toast.error(
          'error' in result ? result.error : 'Échec de la mise à jour du statut'
        )
        return
      }

      toast.success(
        `Marquée comme ${{ new: 'nouvelle', contacted: 'contactée', closed: 'clôturée', spam: 'indésirable' }[newStatus]}`
      )
    })
  }

  return (
    <div role="radiogroup" aria-label="Statut de la demande" className="space-y-2">
      {statuses.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={status === s.value}
          disabled={isPending}
          onClick={() => handleChange(s.value)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-4 py-2.5 font-body text-sm transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            status === s.value
              ? 'bg-white/[0.06] text-white ring-1 ring-cyan-400/50'
              : 'bg-transparent text-[var(--admin-text-secondary)] hover:bg-white/[0.04] hover:text-white'
          )}
        >
          <span>{s.label}</span>
          {status === s.value && (
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--admin-cyan)]">
              Actuel
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
