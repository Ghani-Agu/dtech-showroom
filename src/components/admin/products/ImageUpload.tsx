'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Loader2, Upload, X } from 'lucide-react'
import {
  deleteProductImage,
  uploadProductImage,
} from '@/server/admin-image-actions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { ImageVariant } from '@/lib/image-processing'

interface ImageUploadProps {
  label: string
  description?: string
  variant: ImageVariant
  productSlug: string
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({
  label,
  description,
  variant,
  productSlug,
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
      toast.error('Please upload an image file')
      return
    }

    if (!productSlug) {
      toast.error('Save the product slug first before uploading images')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    startUpload(async () => {
      const result = await uploadProductImage(
        productSlug,
        variant,
        formData
      )

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onChange(result.result.url)
      toast.success(`${variant} image uploaded`)
    })
  }

  function handleDelete() {
    if (!value) return
    if (!confirm(`Delete the ${variant} image?`)) return

    startDelete(async () => {
      const result = await deleteProductImage(value)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onChange('')
      toast.success('Image deleted')
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
        <label className="block font-body text-sm font-medium text-text-secondary">
          {label}
        </label>
        {description && (
          <p className="mt-1 font-body text-xs text-text-muted">
            {description}
          </p>
        )}
      </div>

      {value ? (
        <div className="group relative">
          <div
            className={cn(
              'relative overflow-hidden rounded-md bg-surface-elevated',
              variant === 'hero' ? 'aspect-[16/9]' : 'aspect-[4/3]'
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
              className="rounded-md bg-surface-base/90 px-3 py-1.5 font-body text-xs text-text-primary backdrop-blur transition-colors hover:bg-surface-base"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md bg-semantic-error/90 p-1.5 text-white backdrop-blur transition-colors hover:bg-semantic-error"
              aria-label="Delete image"
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
            variant === 'hero' ? 'aspect-[16/9]' : 'aspect-[4/3]',
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-surface-overlay bg-surface-elevated hover:border-text-muted',
            isPending && 'cursor-not-allowed opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 size={32} className="animate-spin text-accent" />
              <p className="font-body text-sm text-text-secondary">
                Processing image...
              </p>
              <p className="font-mono text-xs text-text-muted">
                Generating WebP + AVIF variants
              </p>
            </>
          ) : (
            <>
              <Upload size={32} className="text-text-muted" />
              <div className="text-center">
                <p className="font-body text-sm text-text-primary">
                  Drag image here, or click to browse
                </p>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  {variant === 'hero'
                    ? '2400×1350'
                    : variant === 'card'
                      ? '800×600'
                      : '1600×1200'}{' '}
                  · WebP + AVIF
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
