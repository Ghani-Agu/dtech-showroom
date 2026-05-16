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
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
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
          'error' in result ? result.error : 'Failed to update status'
        )
        return
      }

      toast.success(`Marked as ${newStatus}`)
    })
  }

  return (
    <div role="radiogroup" aria-label="Inquiry status" className="space-y-2">
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
              ? 'bg-surface-overlay text-text-primary ring-1 ring-accent'
              : 'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
          )}
        >
          <span>{s.label}</span>
          {status === s.value && (
            <span className="font-mono text-xs uppercase tracking-wider text-accent">
              Current
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
