'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import type { EmailProductRef } from '@/lib/email-blocks'
import { searchCampaignProducts } from '@/server/campaign-actions'

interface ProductPickerDialogProps {
  open: boolean
  maxSelectable: number
  onClose: () => void
  onAdd: (products: EmailProductRef[]) => void
}

/** Catalogue search modal for the composer's "Produits" block. */
export function ProductPickerDialog({
  open,
  maxSelectable,
  onClose,
  onAdd,
}: ProductPickerDialogProps) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<EmailProductRef[]>([])
  const [selected, setSelected] = useState<EmailProductRef[]>([])
  const [searching, startSearching] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setSelected([])
    startSearching(async () => {
      setResults(await searchCampaignProducts('').catch(() => []))
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startSearching(async () => {
        setResults(await searchCampaignProducts(q).catch(() => []))
      })
    }, 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, open])

  if (!open) return null

  const toggle = (p: EmailProductRef) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.slug === p.slug)
      if (exists) return prev.filter((s) => s.slug !== p.slug)
      if (prev.length >= maxSelectable) return prev
      return [...prev, p]
    })
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir des produits"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--admin-glass-border-strong)] bg-[var(--admin-surface,#0d0f16)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-glass-border)] px-5 py-4">
          <p className="font-body text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Ajouter des produits ({selected.length}/{maxSelectable})
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1.5 text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-soft-2)] hover:text-[var(--admin-text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <label className="relative flex items-center" aria-label="Rechercher un produit">
            <Search size={14} className="absolute left-3 text-[var(--admin-text-tertiary)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, référence…"
              autoFocus
              className="w-full rounded-full border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] py-2 pl-9 pr-4 font-body text-sm text-[var(--admin-text-primary)] outline-none placeholder:text-[var(--admin-text-tertiary)] focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
            />
          </label>
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-5 py-4">
          {searching && results.length === 0 ? (
            <p className="py-8 text-center font-body text-[13px] text-[var(--admin-text-tertiary)]">
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center font-body text-[13px] text-[var(--admin-text-tertiary)]">
              Aucun produit trouvé.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((p) => {
                const isSel = selected.some((s) => s.slug === p.slug)
                const full = !isSel && selected.length >= maxSelectable
                return (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      disabled={full}
                      aria-pressed={isSel}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        isSel
                          ? 'border-[color-mix(in_oklab,var(--c-mint)_55%,transparent)] bg-[color-mix(in_oklab,var(--c-mint)_10%,transparent)]'
                          : 'border-[var(--admin-glass-border)] hover:border-[var(--admin-glass-border-strong)]'
                      } ${full ? 'opacity-45' : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image || '/placeholder-product.png'}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain"
                      />
                      <span className="min-w-0">
                        {p.brand && (
                          <span className="block truncate font-mono text-[9.5px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                            {p.brand}
                          </span>
                        )}
                        <span className="block truncate font-body text-[13px] font-semibold text-[var(--admin-text-primary)]">
                          {p.name}
                        </span>
                        <span className="block truncate font-body text-[11.5px] text-[var(--admin-text-tertiary)]">
                          {p.tagline}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--admin-glass-border)] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--admin-glass-border)] px-4 py-2 font-body text-[13px] text-[var(--admin-text-secondary)] hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(selected)
              onClose()
            }}
            className="rounded-full bg-[var(--c-mint)] px-4 py-2 font-body text-[13px] font-semibold text-[var(--admin-on-accent)] disabled:opacity-50"
          >
            Ajouter {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
