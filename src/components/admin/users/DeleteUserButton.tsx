'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteUserAccount } from '@/server/admin-user-actions'
import { toast } from '@/lib/toast'

/**
 * « Supprimer » (Round 15) — permanent account deletion from the
 * Utilisateurs page. Two-step: a explicit confirm() naming the account,
 * then the server action (self-delete and last-admin are refused there).
 */
export function DeleteUserButton({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const sure = window.confirm(
      `Supprimer définitivement le compte de « ${userName} » ?\n\n` +
        'Ses sessions sont coupées et il ne pourra plus se connecter. ' +
        'Cette action est irréversible.'
    )
    if (!sure) return
    startTransition(async () => {
      const result = await deleteUserAccount(userId)
      if (result.ok) {
        toast.success(`Compte de ${userName} supprimé`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-[12.5px] font-semibold transition-colors hover:bg-[color-mix(in_oklab,var(--c-rose)_10%,transparent)] disabled:opacity-60"
      style={{
        borderColor: 'color-mix(in oklab, var(--c-rose) 45%, transparent)',
        color: 'var(--c-rose)',
      }}
    >
      <Trash2 size={13} />
      {isPending ? 'Suppression…' : 'Supprimer'}
    </button>
  )
}
