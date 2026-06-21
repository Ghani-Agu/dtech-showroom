'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Textarea } from '@/components/admin/ui/Textarea'
import { updateInquiryNotes } from '@/server/admin-inquiry-actions'
import { toast } from '@/lib/toast'

interface InquiryNotesEditorProps {
  inquiryId: string
  initialNotes: string
}

export function InquiryNotesEditor({
  inquiryId,
  initialNotes,
}: InquiryNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [lastSaved, setLastSaved] = useState<string>(initialNotes)
  const [isPending, startTransition] = useTransition()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (notes === lastSaved) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await updateInquiryNotes(inquiryId, notes)
        if (result.ok) {
          setLastSaved(notes)
        } else {
          toast.error('Échec de l’enregistrement des notes')
        }
      })
    }, 2500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [notes, lastSaved, inquiryId])

  function handleBlur() {
    if (notes === lastSaved) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    startTransition(async () => {
      const result = await updateInquiryNotes(inquiryId, notes)
      if (result.ok) {
        setLastSaved(notes)
        toast.success('Notes enregistrées')
      } else {
        toast.error('Échec de l’enregistrement des notes')
      }
    })
  }

  const isDirty = notes !== lastSaved

  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        placeholder="Ajouter des notes internes — visibles uniquement par l'équipe…"
        maxLength={5000}
      />
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-[var(--admin-text-tertiary)]">
          {notes.length} / 5000
        </p>
        <p className="font-mono text-xs text-[var(--admin-text-tertiary)]">
          {isPending
            ? 'Enregistrement…'
            : isDirty
              ? 'Modifications non enregistrées'
              : initialNotes || lastSaved
                ? 'Enregistré'
                : ''}
        </p>
      </div>
    </div>
  )
}
