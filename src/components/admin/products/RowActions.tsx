'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import {
  archiveProduct,
  restoreProduct,
} from '@/server/admin-product-actions'
import { toast } from '@/lib/toast'

/** Quick actions on each product row: view on site, hide/show, edit. */
export function RowActions({
  productId,
  slug,
  isArchived,
}: {
  productId: string
  slug: string
  isArchived: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreProduct(productId)
        : await archiveProduct(productId)
      if (result.ok) {
        toast.success(
          isArchived ? 'Produit remis en ligne' : 'Produit masqué du site'
        )
        router.refresh()
      } else {
        toast.error('Action impossible')
      }
    })
  }

  const btn =
    'inline-flex size-8 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]'

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <a
        href={`/fr/products/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Voir sur le site"
        aria-label="Voir sur le site"
        className={btn}
        style={{
          borderColor: 'color-mix(in oklab, var(--c-blue) 30%, transparent)',
          color: 'var(--c-blue)',
          background: 'color-mix(in oklab, var(--c-blue) 8%, transparent)',
        }}
      >
        <ExternalLink size={13} />
      </a>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        title={isArchived ? 'Remettre en ligne' : 'Masquer du site'}
        aria-label={isArchived ? 'Remettre en ligne' : 'Masquer du site'}
        className={btn + ' disabled:opacity-50'}
        style={
          isArchived
            ? {
                borderColor: 'color-mix(in oklab, var(--c-emerald) 35%, transparent)',
                color: 'var(--c-emerald-text)',
                background: 'color-mix(in oklab, var(--c-emerald) 8%, transparent)',
              }
            : {
                borderColor: 'color-mix(in oklab, var(--c-rose) 30%, transparent)',
                color: 'var(--c-rose)',
                background: 'color-mix(in oklab, var(--c-rose) 8%, transparent)',
              }
        }
      >
        {isArchived ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <Link
        href={`/admin/products/${productId}/edit`}
        title="Modifier"
        aria-label="Modifier"
        className={btn}
        style={{
          borderColor: 'color-mix(in oklab, var(--c-mint) 30%, transparent)',
          color: 'var(--c-mint)',
          background: 'color-mix(in oklab, var(--c-mint) 8%, transparent)',
        }}
      >
        <Pencil size={13} />
      </Link>
    </span>
  )
}
