'use client'

/**
 * ImageLibraryPicker — "choisir une image déjà en ligne".
 *
 * ROUND 22, added next to (not instead of) the uploader: every image field in
 * the admin could only take a file from the machine you were sitting at.
 * Re-using something already on the site meant hunting for the original file.
 *
 * Three ways in, in the order people actually reach for them:
 *   1. pick from the grid of images the site already has;
 *   2. paste a URL (a supplier's CDN, an R2 link, anything);
 *   3. close it and drag a file in, exactly as before.
 */

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ImageIcon, Loader2, Search, X } from 'lucide-react'
import {
  listLibraryImages,
  type LibraryImage,
} from '@/server/admin-image-library'
import type { EntityType } from '@/lib/admin-image-entity'

interface Props {
  entityType: EntityType
  /** 16/9 for heroes, 1/1 for logos — matches the field it fills. */
  aspect?: string
  onPick: (url: string) => void
  onClose: () => void
}

export function ImageLibraryPicker({
  entityType,
  aspect = '16 / 9',
  onPick,
  onClose,
}: Props) {
  const [images, setImages] = useState<LibraryImage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [manual, setManual] = useState('')
  // The catalogue can hold several hundred images; render a page at a time so
  // opening the picker is never a few-hundred-request thumbnail storm.
  const [limit, setLimit] = useState(48)
  const [loading, startLoad] = useTransition()

  useEffect(() => {
    startLoad(async () => {
      const res = await listLibraryImages(entityType)
      if (res.ok) setImages(res.images)
      else setError(res.error)
    })
  }, [entityType])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = useMemo(() => {
    if (!images) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return images
    return images.filter((i) => i.label.toLowerCase().includes(needle))
  }, [images, q])

  const page = shown.slice(0, limit)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.1]"
        style={{ background: 'var(--admin-canvas)' }}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
          <ImageIcon size={17} style={{ color: 'var(--c-mint)' }} />
          <h2 className="font-body text-[15px] font-semibold text-white">
            Choisir une image
          </h2>
          <div className="relative ms-auto">
            <Search
              size={14}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto"
              style={{ color: 'var(--admin-text-tertiary)' }}
            />
            <input
              value={q}
              onChange={(e) => {
              setQ(e.target.value)
              setLimit(48)
            }}
              placeholder="Filtrer…"
              className="w-52 rounded-lg border border-white/[0.08] bg-black/30 py-1.5 ps-8 pe-3 font-body text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && !images ? (
            <div className="flex items-center justify-center gap-2 py-16 font-body text-sm text-[var(--admin-text-tertiary)]">
              <Loader2 size={15} className="animate-spin" />
              Chargement de la bibliothèque…
            </div>
          ) : error ? (
            <p className="py-16 text-center font-body text-sm text-[var(--c-amber)]">
              {error}
            </p>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center font-body text-sm text-[var(--admin-text-tertiary)]">
              {q
                ? 'Aucune image ne correspond.'
                : 'Aucune image en ligne pour le moment — envoyez-en une ci-dessous.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {page.map((img) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => {
                      onPick(img.url)
                      onClose()
                    }}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] text-start transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--c-mint)_55%,transparent)]"
                  >
                    <div
                      className="relative w-full overflow-hidden bg-white/[0.04]"
                      style={{ aspectRatio: aspect }}
                    >
                      {/* A plain <img>, deliberately: the sources here include
                          pasted URLs and R2 hosts that next/image would refuse
                          for not being in remotePatterns, and lazy loading
                          keeps an unopened row from fetching at all. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <p
                      className="truncate px-2.5 py-2 font-mono text-[10.5px]"
                      style={{ color: 'var(--admin-text-tertiary)' }}
                      title={img.label}
                    >
                      {img.label}
                    </p>
                  </button>
                ))}
              </div>
              {shown.length > page.length ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 48)}
                    className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-white/[0.09]"
                  >
                    Afficher plus ({shown.length - page.length} restantes)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] px-5 py-4">
          <label className="font-body text-xs text-[var(--admin-text-tertiary)]">
            ou coller une adresse
          </label>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="https://… ou /images/…"
            dir="ltr"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
          />
          <button
            type="button"
            disabled={!manual.trim()}
            onClick={() => {
              onPick(manual.trim())
              onClose()
            }}
            className="rounded-lg border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            Utiliser
          </button>
        </div>
      </div>
    </div>
  )
}
