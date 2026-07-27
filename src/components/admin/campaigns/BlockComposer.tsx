'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  Package,
  Plus,
  Text,
  Trash2,
  Type,
} from 'lucide-react'
import type { EmailBlock, EmailBlockType, EmailProductRef } from '@/lib/email-blocks'
import { ProductPickerDialog } from './ProductPickerDialog'

const BLOCK_META: Record<
  EmailBlockType,
  { label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }
> = {
  heading: { label: 'Titre', icon: Type },
  text: { label: 'Texte', icon: Text },
  image: { label: 'Image', icon: ImageIcon },
  button: { label: 'Bouton', icon: MousePointerClick },
  products: { label: 'Produits', icon: Package },
  divider: { label: 'Séparateur', icon: Minus },
  spacer: { label: 'Espace', icon: MoveVertical },
  html: { label: 'HTML libre', icon: Code2 },
}

const ADDABLE: EmailBlockType[] = [
  'heading',
  'text',
  'image',
  'button',
  'products',
  'divider',
  'spacer',
  'html',
]

const inputCls =
  'w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-3.5 py-2 font-body text-[13.5px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]'
const monoCls =
  'w-full rounded-xl border border-[var(--admin-glass-border)] bg-[var(--admin-soft)] px-3.5 py-2.5 font-mono text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--c-violet)_50%,transparent)]'
const microLabel =
  'mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-tertiary)]'

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `blk-${Math.random().toString(36).slice(2, 10)}`
  }
}

function starterFor(type: EmailBlockType): EmailBlock {
  const base: EmailBlock = { id: newId(), type }
  switch (type) {
    case 'heading':
      return { ...base, text: '' }
    case 'text':
      return { ...base, text: '' }
    case 'button':
      return { ...base, label: 'Voir le catalogue', href: '/fr/products', align: 'left' }
    case 'spacer':
      return { ...base, size: 24 }
    case 'products':
      return { ...base, products: [] }
    default:
      return base
  }
}

interface BlockComposerProps {
  blocks: EmailBlock[]
  onChange: (blocks: EmailBlock[]) => void
  disabled?: boolean
}

/** The campaign body editor — an ordered list of email-safe blocks. */
export function BlockComposer({ blocks, onChange, disabled }: BlockComposerProps) {
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  const patch = (id: string, partial: Partial<EmailBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)))

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id))

  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= blocks.length) return
    const next = [...blocks]
    const a = next[i]
    const b = next[j]
    if (!a || !b) return
    next[i] = b
    next[j] = a
    onChange(next)
  }

  const duplicate = (id: string) => {
    const i = blocks.findIndex((b) => b.id === id)
    const src = blocks[i]
    if (!src) return
    const copy: EmailBlock = {
      ...src,
      id: newId(),
      ...(src.products ? { products: src.products.map((p) => ({ ...p })) } : {}),
    }
    onChange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)])
  }

  const add = (type: EmailBlockType) => onChange([...blocks, starterFor(type)])

  const pickerBlock = blocks.find((b) => b.id === pickerFor)

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--admin-glass-border-strong)] px-4 py-6 text-center font-body text-[13px] text-[var(--admin-text-tertiary)]">
          Aucun bloc — ajoutez un titre, du texte ou des produits ci-dessous.
        </p>
      )}

      {blocks.map((b, i) => {
        const meta = BLOCK_META[b.type]
        const Icon = meta.icon
        return (
          <div
            key={b.id}
            className="rounded-xl border border-[var(--admin-glass-border)] bg-[color-mix(in_oklab,var(--admin-soft)_60%,transparent)]"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--c-mint)_12%,transparent)] text-[var(--c-mint)]">
                <Icon size={13} />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--admin-text-secondary)]">
                {meta.label}
              </span>
              <span className="ml-auto inline-flex items-center gap-0.5">
                <IconBtn
                  label="Monter"
                  onClick={() => move(b.id, -1)}
                  disabled={disabled || i === 0}
                >
                  <ChevronUp size={14} />
                </IconBtn>
                <IconBtn
                  label="Descendre"
                  onClick={() => move(b.id, 1)}
                  disabled={disabled || i === blocks.length - 1}
                >
                  <ChevronDown size={14} />
                </IconBtn>
                <IconBtn label="Dupliquer" onClick={() => duplicate(b.id)} disabled={disabled}>
                  <Copy size={13} />
                </IconBtn>
                <IconBtn label="Supprimer" onClick={() => remove(b.id)} disabled={disabled} danger>
                  <Trash2 size={13} />
                </IconBtn>
              </span>
            </div>

            <div className="px-3 pb-3">
              {b.type === 'heading' && (
                <input
                  type="text"
                  value={b.text ?? ''}
                  disabled={disabled}
                  maxLength={200}
                  onChange={(e) => patch(b.id, { text: e.target.value })}
                  placeholder="Votre titre…"
                  className={inputCls}
                />
              )}

              {b.type === 'text' && (
                <textarea
                  value={b.text ?? ''}
                  disabled={disabled}
                  rows={4}
                  maxLength={8000}
                  onChange={(e) => patch(b.id, { text: e.target.value })}
                  placeholder={'Votre paragraphe…\n\nLigne vide = nouveau paragraphe.'}
                  className={inputCls}
                />
              )}

              {b.type === 'image' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <span className={microLabel}>URL de l’image (https://… ou /images/…)</span>
                    <input
                      type="text"
                      value={b.src ?? ''}
                      disabled={disabled}
                      onChange={(e) => patch(b.id, { src: e.target.value })}
                      placeholder="/images/products/…/hero.webp"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <span className={microLabel}>Texte alternatif</span>
                    <input
                      type="text"
                      value={b.alt ?? ''}
                      disabled={disabled}
                      onChange={(e) => patch(b.id, { alt: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <span className={microLabel}>Lien au clic (optionnel)</span>
                    <input
                      type="text"
                      value={b.href ?? ''}
                      disabled={disabled}
                      onChange={(e) => patch(b.id, { href: e.target.value })}
                      placeholder="/fr/products"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {b.type === 'button' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_130px]">
                  <div>
                    <span className={microLabel}>Libellé</span>
                    <input
                      type="text"
                      value={b.label ?? ''}
                      disabled={disabled}
                      maxLength={120}
                      onChange={(e) => patch(b.id, { label: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <span className={microLabel}>Lien</span>
                    <input
                      type="text"
                      value={b.href ?? ''}
                      disabled={disabled}
                      onChange={(e) => patch(b.id, { href: e.target.value })}
                      placeholder="/fr/products ou https://…"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <span className={microLabel}>Alignement</span>
                    <select
                      value={b.align ?? 'left'}
                      disabled={disabled}
                      onChange={(e) =>
                        patch(b.id, { align: e.target.value === 'center' ? 'center' : 'left' })
                      }
                      className={inputCls}
                    >
                      <option value="left">Gauche</option>
                      <option value="center">Centré</option>
                    </select>
                  </div>
                </div>
              )}

              {b.type === 'products' && (
                <div className="space-y-2">
                  {(b.products ?? []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(b.products ?? []).map((p) => (
                        <li
                          key={p.slug}
                          className="flex items-center gap-2.5 rounded-lg border border-[var(--admin-glass-border)] px-2.5 py-1.5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image || '/placeholder-product.png'}
                            alt=""
                            width={30}
                            height={30}
                            className="h-[30px] w-[30px] shrink-0 rounded-md bg-white object-contain"
                          />
                          <span className="min-w-0 flex-1 truncate font-body text-[12.5px] text-[var(--admin-text-primary)]">
                            {p.name}
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Retirer ${p.name}`}
                            onClick={() =>
                              patch(b.id, {
                                products: (b.products ?? []).filter((x) => x.slug !== p.slug),
                              })
                            }
                            className="rounded-full p-1 text-[var(--admin-text-tertiary)] hover:text-[var(--c-rose)]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(b.products ?? []).length < 3 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setPickerFor(b.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--admin-glass-border-strong)] px-3 py-1.5 font-body text-[12.5px] text-[var(--admin-text-secondary)] hover:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)] hover:text-[var(--admin-text-primary)]"
                    >
                      <Plus size={13} /> Choisir des produits ({(b.products ?? []).length}/3)
                    </button>
                  )}
                </div>
              )}

              {b.type === 'divider' && (
                <div className="h-px bg-[var(--admin-glass-border-strong)]" aria-hidden />
              )}

              {b.type === 'spacer' && (
                <label className="flex items-center gap-3">
                  <input
                    type="range"
                    min={8}
                    max={96}
                    step={4}
                    value={b.size ?? 24}
                    disabled={disabled}
                    onChange={(e) => patch(b.id, { size: Number(e.target.value) })}
                    className="flex-1 accent-[var(--c-mint)]"
                  />
                  <span className="w-12 text-right font-mono text-[11px] text-[var(--admin-text-tertiary)]">
                    {b.size ?? 24}px
                  </span>
                </label>
              )}

              {b.type === 'html' && (
                <div>
                  <textarea
                    value={b.html ?? ''}
                    disabled={disabled}
                    rows={7}
                    onChange={(e) => patch(b.id, { html: e.target.value })}
                    placeholder="<p>HTML libre…</p>"
                    className={monoCls}
                  />
                  <p className="mt-1 font-body text-[11px] text-[var(--admin-text-tertiary)]">
                    Scripts et gestionnaires d’événements sont retirés à l’enregistrement.
                    Styles inline uniquement — les emails n’acceptent pas les CSS externes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* ── add-block bar ── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-[var(--admin-glass-border-strong)] p-2.5">
        <span className="px-1 font-mono text-[10px] uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Ajouter
        </span>
        {ADDABLE.map((type) => {
          const meta = BLOCK_META[type]
          const Icon = meta.icon
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => add(type)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-glass-border)] px-2.5 py-1.5 font-body text-[12px] text-[var(--admin-text-secondary)] transition-colors hover:border-[color-mix(in_oklab,var(--c-mint)_45%,transparent)] hover:text-[var(--admin-text-primary)] disabled:opacity-50"
            >
              <Icon size={12} /> {meta.label}
            </button>
          )
        })}
      </div>

      <ProductPickerDialog
        open={pickerFor !== null}
        maxSelectable={3 - (pickerBlock?.products?.length ?? 0)}
        onClose={() => setPickerFor(null)}
        onAdd={(picked) => {
          if (!pickerBlock) return
          const existing = pickerBlock.products ?? []
          const merged = [
            ...existing,
            ...picked.filter((p) => !existing.some((e) => e.slug === p.slug)),
          ].slice(0, 3)
          patch(pickerBlock.id, { products: merged })
        }}
      />
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 transition-colors disabled:opacity-35 ${
        danger
          ? 'text-[var(--admin-text-tertiary)] hover:bg-[color-mix(in_oklab,var(--c-rose)_10%,transparent)] hover:text-[var(--c-rose)]'
          : 'text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-soft-2)] hover:text-[var(--admin-text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}
