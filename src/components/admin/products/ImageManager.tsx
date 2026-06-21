'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { GripVertical, Loader2, Upload, X } from 'lucide-react'
import {
  deleteEntityImage,
  uploadEntityImage,
} from '@/server/admin-image-actions'
import type { EntityType } from '@/lib/admin-image-entity'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface ImageManagerProps {
  label: string
  description?: string
  entityType: EntityType
  entitySlug: string
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageManager({
  label,
  description,
  entityType,
  entitySlug,
  value,
  onChange,
  maxImages = 8,
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startUpload] = useTransition()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!entitySlug) {
      toast.error("Enregistrez d'abord le produit avant d'ajouter des photos")
      return
    }

    if (value.length + files.length > maxImages) {
      toast.error(
        `Maximum ${maxImages} photos (actuellement ${value.length}).`
      )
      return
    }

    startUpload(async () => {
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue
        if (!file.type.startsWith('image/')) continue

        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadEntityImage(
          entityType,
          entitySlug,
          'carousel',
          formData
        )

        if (result.ok) {
          newUrls.push(result.result.url)
        } else {
          toast.error(`Failed: ${file.name} ” ${result.error}`)
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
        toast.success(
          `Uploaded ${newUrls.length} image${newUrls.length > 1 ? 's' : ''}`
        )
      }
    })
  }

  async function handleRemove(url: string, index: number) {
    if (!confirm('Retirer cette photo ?')) return

    const result = await deleteEntityImage(url)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    onChange(value.filter((_, i) => i !== index))
    toast.success('Photo retirée')
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const dragged = value[draggedIndex]
    if (!dragged) return

    const newOrder = value.filter((_, i) => i !== draggedIndex)
    newOrder.splice(index, 0, dragged)

    setDraggedIndex(index)
    onChange(newOrder)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {value.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative aspect-[4/3] cursor-move overflow-hidden rounded-md bg-white/[0.04]',
              draggedIndex === index && 'opacity-50'
            )}
          >
            <Image
              src={url}
              alt=""
              fill
              sizes="300px"
              className="object-cover"
            />
            <div className="absolute left-1 top-1 rounded bg-[var(--admin-canvas)]/80 p-1 text-[var(--admin-text-tertiary)] backdrop-blur">
              <GripVertical size={12} />
            </div>
            <div className="absolute right-1 top-1">
              <button
                type="button"
                onClick={() => handleRemove(url, index)}
                className="rounded bg-rose-500/90 p-1 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                aria-label="Retirer la photo"
              >
                <X size={12} />
              </button>
            </div>
            <div className="absolute bottom-1 left-1 rounded bg-[var(--admin-canvas)]/80 px-1.5 py-0.5 font-mono text-xs text-[var(--admin-text-tertiary)] backdrop-blur">
              {index + 1}
            </div>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => !isPending && inputRef.current?.click()}
            disabled={isPending}
            className={cn(
              'flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
              isPending
                ? 'cursor-not-allowed border-white/[0.08] opacity-50'
                : 'cursor-pointer border-white/[0.08] hover:border-text-muted'
            )}
          >
            {isPending ? (
              <>
                <Loader2 size={20} className="animate-spin text-[var(--admin-cyan)]" />
                <p className="font-body text-xs text-[var(--admin-text-secondary)]">
                  Envoi en cours…
                </p>
              </>
            ) : (
              <>
                <Upload size={20} className="text-[var(--admin-text-tertiary)]" />
                <p className="font-body text-xs text-[var(--admin-text-secondary)]">
                  Ajouter des photos
                </p>
                <p className="font-mono text-xs text-[var(--admin-text-tertiary)]">
                  {value.length}/{maxImages}
                </p>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
