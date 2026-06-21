'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createCampaign } from '@/server/campaign-actions'

export function CreateCampaignButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await createCampaign()
          if (r.ok && r.id) {
            router.push(`/admin/campaigns/${r.id}`)
          } else if (!r.ok) {
            toast.error(r.error || 'Échec de la création')
          }
        })
      }}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--c-mint)] px-4 py-2 font-body text-sm font-semibold text-[var(--admin-on-accent)] shadow-sm transition-transform hover:-translate-y-px disabled:opacity-60"
    >
      <Plus size={15} /> Nouvelle campagne
    </button>
  )
}
