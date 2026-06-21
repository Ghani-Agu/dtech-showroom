'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Loader2, Upload, X } from 'lucide-react'
import {
  deleteEntityImage,
  uploadEntityImage,
} from '@/server/admin-image-actions'
import type { EntityType } from '@/lib/admin-image-entity'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { ImageVariant } from '@/lib/image-processing'

interface ImageUploadProps {
  label: string
  description?: string
  variant: ImageVariant
  entityType: EntityType
  entitySlug: string
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({
  label,
  description,
  variant,
  entityType,
  entitySlug,
  value,
  onChange,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, startUpload] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isDragging, setIsDragging] = useState(false)

  const isPending = isUploading || isDeleting

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir un fichier image')
      return
    }

    if (!entitySlug) {
      toast.error("Enregistrez d'abord le produit avant d'ajouter des photos")
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    startUpload(async () => {
      const result = await uploadEntityImage(
        entityType,
        entitySlug,
        variant,
        formData
      )

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onChange(result.result.url)
      toast.success('Photo ajoutée')
    })
  }

  function handleDelete() {
    if (!value) return
    if (!confirm(`Delete the ${variant} image?`)) return

    startDelete(async () => {
      const result = await deleteEntityImage(value)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onChange('')
      toast.success('Photo supprimée')
    })
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isPending) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block font-body text-sm font-medium text-[var(--admin-text-secondary)]">
          {label}
        </label>
        {description && (
          <p className="mt-1 font-body text-xs text-[var(--admin-text-tertiary)]">
            {description}
          </p>
        )}
      </div>

      {value ? (
        <div className="group relative">
          <div
            className={cn(
              'relative overflow-hidden rounded-md bg-white/[0.04]',
              variant === 'hero'
                ? 'aspect-[16/9]'
                : variant === 'logo'
                  ? 'aspect-square'
                  : 'aspect-[4/3]'
            )}
          >
            <Image
              src={value}
              alt=""
              fill
              sizes={variant === 'hero' ? '1200px' : '400px'}
              className="object-cover"
            />
          </div>
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="rounded-md bg-[var(--admin-canvas)]/90 px-3 py-1.5 font-body text-xs text-white backdrop-blur transition-colors hover:bg-[var(--admin-canvas)]"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md bg-rose-500/90 p-1.5 text-white backdrop-blur transition-colors hover:bg-rose-500"
              aria-label="Supprimer la photo"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isPending && inputRef.current?.click()}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed transition-colors',
            variant === 'hero'
              ? 'aspect-[16/9]'
              : variant === 'logo'
                ? 'aspect-square'
                : 'aspect-[4/3]',
            isDragging
              ? 'border-cyan-400/30 bg-[var(--admin-cyan)]/5'
              : 'border-white/[0.08] bg-white/[0.04] hover:border-text-muted',
            isPending && 'cursor-not-allowed opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 size={32} className="animate-spin text-[var(--admin-cyan)]" />
              <p className="font-body text-sm text-[var(--admin-text-secondary)]">
                Optimisation de la photo…
              </p>
              <p className="font-mono text-xs text-[var(--admin-text-tertiary)]">
                Generating WebP + AVIF variants
              </p>
            </>
          ) : (
            <>
              <Upload size={32} className="text-[var(--admin-text-tertiary)]" />
              <div className="text-center">
                <p className="font-body text-sm text-white">
                  Glissez une photo ici, ou cliquez pour parcourir
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--admin-text-tertiary)]">
                  {variant === 'hero'
                    ? '2400Ã—1350'
                    : variant === 'card'
                      ? '800Ã—600'
                      : variant === 'logo'
                        ? '600Ã—600'
                        : '1600Ã—1200'}{' '}
                  Â· WebP + AVIF
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
