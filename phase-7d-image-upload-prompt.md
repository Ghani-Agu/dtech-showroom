You are executing Phase 7d — Image Upload via Cloudflare R2 for the 
Dtech Showroom project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 7c complete (latest commit: 0c07d52): products CRUD with 
  bilingual fields, soft delete, ProductForm has placeholder TEXT 
  inputs for image paths
- Cloudflare R2 IS ALREADY SET UP (user completed manual setup before 
  running this phase). The following env vars are in .env.local:
  - R2_ACCOUNT_ID
  - R2_ACCESS_KEY_ID
  - R2_SECRET_ACCESS_KEY
  - R2_BUCKET_NAME=dtech-showroom-images
  - R2_PUBLIC_URL=https://pub-*.r2.dev
- v2 brand spec source of truth for visual decisions
- Phase 7a UI primitives available

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Replace the placeholder text inputs in ProductForm's Images section 
with a real drag-and-drop multi-file upload system backed by 
Cloudflare R2. Server-side image processing via sharp generates 
optimized AVIF + WebP variants at three sizes (card 800×600, hero 
2400×1350, carousel 1600×1200). Images upload to R2 under organized 
keys (products/[slug]/[variant]-[hash].[format]). Database stores 
the URL paths returned from R2. Admin UI shows image previews with 
reorder via drag, delete with confirmation, and clear loading/error 
states. After this lands, Dtech can upload product photos directly 
through the admin UI; the catalog updates without developer 
involvement.

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- Image editing UI beyond upload/delete/reorder (no cropping, no 
  filters — those are Phase 7g+ if Dtech requests)
- Bulk image upload across multiple products
- AI-generated alt text or auto-tagging
- Image search / library browser
- Brand and category logo uploads (Phase 7e — same pattern, separate 
  table)
- User profile pictures (Phase 7e)
- 3D model upload (.glb files) — defer until 3D is in scope post-launch
- Direct browser uploads via presigned URLs (server-side route is 
  simpler for Phase 1)
- CDN cache invalidation on update (R2 + Cloudflare CDN handles this 
  via versioned URLs)
- Image optimization at request time (we pre-generate variants)
- Modifying customer-facing image display (next/image already 
  handles delivery)
- Modifying v2 brand spec, brand-tokens.ts, fonts.ts
- Touching /motion or any (dev) routes
- Modifying auth flow

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Verify R2 env vars are present
  2. Install dependencies (@aws-sdk/client-s3, sharp)
  3. R2 client + utilities
  4. Image processing pipeline (sharp variants)
  5. Upload server action
  6. Delete server action
  7. ImageUpload component (drag-drop + preview)
  8. ImageManager component (multi-image with reorder)
  9. Update ProductForm — replace placeholder text inputs with new 
     components
  10. Add R2 envs to .env.example
  11. Verification (lint, tsc, build, smoke tests, manual upload test)
  12. Commit

tsc checkpoint after task 4 and task 8.

================================================================
TASK 1 — VERIFY R2 ENVIRONMENT
================================================================

Check that .env.local has the R2 vars. Run:
  Get-Content .env.local | Select-String "R2_"

Expected output should show 5 lines:
  R2_ACCOUNT_ID=...
  R2_ACCESS_KEY_ID=...
  R2_SECRET_ACCESS_KEY=...
  R2_BUCKET_NAME=dtech-showroom-images
  R2_PUBLIC_URL=https://pub-...r2.dev

If ANY are missing, STOP and ask the user to complete R2 setup first 
(reference: cloudflare-r2-setup-guide.md). Do not proceed.

================================================================
TASK 2 — INSTALL DEPENDENCIES
================================================================

Run:
  pnpm add @aws-sdk/client-s3 sharp

Verify installation:
  pnpm list @aws-sdk/client-s3 sharp

Both should be present. sharp may show a postinstall step downloading 
its native binary — that's expected. The binary is platform-specific 
and Vercel-compatible.

Bundle impact note: @aws-sdk/client-s3 is ~80KB but server-only 
(never bundled to client). sharp is native code, also server-only.

================================================================
TASK 3 — R2 CLIENT + UTILITIES
================================================================

Create src/lib/r2.ts:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required R2 environment variables')
  }
  console.warn('[r2] Missing R2 env vars — uploads will fail until configured')
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: accountId 
    ? `https://${accountId}.r2.cloudflarestorage.com` 
    : 'https://placeholder.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: accessKeyId ?? 'placeholder',
    secretAccessKey: secretAccessKey ?? 'placeholder',
  },
})

export const R2_BUCKET = bucketName ?? ''
export const R2_PUBLIC_BASE = publicUrl ?? ''

/**
 * Builds the full public URL for an R2 object key.
 * Example: buildPublicUrl('products/hp-omen-16/hero-abc.webp')
 *   → 'https://pub-abc.r2.dev/products/hp-omen-16/hero-abc.webp'
 */
export function buildPublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`
}

/**
 * Extracts the R2 object key from a full public URL.
 * Used when deleting — we store full URLs in DB but need keys for the API.
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url.startsWith(R2_PUBLIC_BASE)) return null
  return url.slice(R2_PUBLIC_BASE.length + 1)  // +1 for the slash
}

/**
 * Generates a short hash for filename uniqueness.
 * Combines original filename + timestamp + random bytes.
 */
export function generateHash(input: string): string {
  return createHash('sha256')
    .update(input + Date.now() + Math.random())
    .digest('hex')
    .slice(0, 8)
}

/**
 * Uploads a buffer to R2 under a given key.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ key: string; url: string }> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Long cache — keys are content-hashed so updates produce new URLs
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  
  return {
    key,
    url: buildPublicUrl(key),
  }
}

/**
 * Deletes an object from R2 by key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  )
}
```

================================================================
TASK 4 — IMAGE PROCESSING PIPELINE
================================================================

Create src/lib/image-processing.ts:

```typescript
import sharp from 'sharp'

export type ImageVariant = 'card' | 'hero' | 'carousel'
export type ImageFormat = 'webp' | 'avif'

interface VariantSpec {
  width: number
  height: number
  fit: keyof sharp.FitEnum
  quality: {
    webp: number
    avif: number
  }
}

export const VARIANT_SPECS: Record<ImageVariant, VariantSpec> = {
  card: {
    width: 800,
    height: 600,
    fit: 'cover',
    quality: { webp: 82, avif: 60 },
  },
  hero: {
    width: 2400,
    height: 1350,
    fit: 'cover',
    quality: { webp: 85, avif: 65 },
  },
  carousel: {
    width: 1600,
    height: 1200,
    fit: 'cover',
    quality: { webp: 82, avif: 60 },
  },
}

/**
 * Validates an uploaded image buffer.
 * Throws if the image is invalid, too large, or wrong format.
 */
export async function validateImage(buffer: Buffer): Promise<{
  format: string
  width: number
  height: number
  size: number
}> {
  const meta = await sharp(buffer).metadata()
  
  if (!meta.format || !meta.width || !meta.height) {
    throw new Error('Invalid image — could not read metadata')
  }
  
  const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff']
  if (!validFormats.includes(meta.format)) {
    throw new Error(`Unsupported image format: ${meta.format}`)
  }
  
  // Reject images that are too small to be useful
  if (meta.width < 400 || meta.height < 300) {
    throw new Error(`Image too small: ${meta.width}×${meta.height} (minimum 400×300)`)
  }
  
  // Reject huge files (>20MB pre-compression)
  if (buffer.length > 20 * 1024 * 1024) {
    throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max 20MB)`)
  }
  
  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    size: buffer.length,
  }
}

/**
 * Processes a source image into a specific variant + format.
 */
export async function processVariant(
  sourceBuffer: Buffer,
  variant: ImageVariant,
  format: ImageFormat,
): Promise<Buffer> {
  const spec = VARIANT_SPECS[variant]
  
  let pipeline = sharp(sourceBuffer)
    .resize(spec.width, spec.height, {
      fit: spec.fit,
      position: 'attention',  // smart cropping based on saliency
      withoutEnlargement: false,
    })
  
  if (format === 'webp') {
    pipeline = pipeline.webp({
      quality: spec.quality.webp,
      effort: 4,
    })
  } else if (format === 'avif') {
    pipeline = pipeline.avif({
      quality: spec.quality.avif,
      effort: 4,
    })
  }
  
  return pipeline.toBuffer()
}
```

Note: sharp's `position: 'attention'` uses libvips' saliency detection 
to crop intelligently (focuses on the product, not the background). 
Better than `'centre'` for product photography.

================================================================
TASK 5 — UPLOAD SERVER ACTION
================================================================

Create src/server/admin-image-actions.ts:

```typescript
'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { 
  uploadToR2, 
  deleteFromR2, 
  generateHash, 
  extractKeyFromUrl,
} from '@/lib/r2'
import { 
  processVariant, 
  validateImage, 
  type ImageVariant,
} from '@/lib/image-processing'

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null)
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session.user
}

interface UploadResult {
  url: string         // Primary URL (WebP for compatibility)
  urlAvif: string     // AVIF URL for better compression
  variant: ImageVariant
  width: number
  height: number
}

/**
 * Uploads a single image, generating WebP + AVIF variants at the 
 * specified size class. Returns both URLs.
 * 
 * @param productSlug - used in the R2 key for organization
 * @param variant - 'card' | 'hero' | 'carousel'
 * @param formData - must contain 'file' field with the image
 */
export async function uploadProductImage(
  productSlug: string,
  variant: ImageVariant,
  formData: FormData,
): Promise<{ ok: true; result: UploadResult } | { ok: false; error: string }> {
  try {
    await requireSession()
    
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return { ok: false, error: 'No file provided' }
    }
    
    // Validate slug for safety (no path traversal, etc.)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
      return { ok: false, error: 'Invalid product slug' }
    }
    
    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const sourceBuffer = Buffer.from(arrayBuffer)
    
    // Validate
    const meta = await validateImage(sourceBuffer)
    
    // Process both formats
    const [webpBuffer, avifBuffer] = await Promise.all([
      processVariant(sourceBuffer, variant, 'webp'),
      processVariant(sourceBuffer, variant, 'avif'),
    ])
    
    // Generate content-hashed keys
    const hash = generateHash(file.name)
    const webpKey = `products/${productSlug}/${variant}-${hash}.webp`
    const avifKey = `products/${productSlug}/${variant}-${hash}.avif`
    
    // Upload both in parallel
    const [webpResult, avifResult] = await Promise.all([
      uploadToR2(webpKey, webpBuffer, 'image/webp'),
      uploadToR2(avifKey, avifBuffer, 'image/avif'),
    ])
    
    return {
      ok: true,
      result: {
        url: webpResult.url,
        urlAvif: avifResult.url,
        variant,
        width: meta.width,
        height: meta.height,
      },
    }
  } catch (err) {
    console.error('[upload] Failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    }
  }
}

/**
 * Deletes an image from R2 (and its AVIF sibling if present).
 * Database update happens via the ProductForm's main save action.
 */
export async function deleteProductImage(
  imageUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSession()
    
    const key = extractKeyFromUrl(imageUrl)
    if (!key) {
      return { ok: false, error: 'Invalid image URL' }
    }
    
    // Delete the URL provided
    await deleteFromR2(key)
    
    // Also delete the AVIF sibling if it's a WebP
    if (key.endsWith('.webp')) {
      const avifKey = key.replace(/\.webp$/, '.avif')
      await deleteFromR2(avifKey).catch(() => {
        // AVIF may not exist; ignore failure
      })
    } else if (key.endsWith('.avif')) {
      const webpKey = key.replace(/\.avif$/, '.webp')
      await deleteFromR2(webpKey).catch(() => {
        // WebP may not exist; ignore failure
      })
    }
    
    return { ok: true }
  } catch (err) {
    console.error('[delete] Failed:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Delete failed',
    }
  }
}
```

================================================================
TASK 6 — DELETE WAS HANDLED IN TASK 5
================================================================

Already done.

================================================================
TASK 7 — IMAGE UPLOAD COMPONENT
================================================================

Create src/components/admin/products/ImageUpload.tsx:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { uploadProductImage, deleteProductImage } from '@/server/admin-image-actions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { ImageVariant } from '@/lib/image-processing'

interface ImageUploadProps {
  label: string
  description?: string
  variant: ImageVariant
  productSlug: string
  value: string                    // current URL (or empty string)
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
      const result = await uploadProductImage(productSlug, variant, formData)
      
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
          <p className="font-body text-xs text-text-muted mt-1">{description}</p>
        )}
      </div>
      
      {value ? (
        // Has image: show preview with delete
        <div className="relative group">
          <div className={cn(
            'relative overflow-hidden rounded-md bg-surface-elevated',
            variant === 'hero' ? 'aspect-[16/9]' : variant === 'card' ? 'aspect-[4/3]' : 'aspect-[4/3]'
          )}>
            <Image
              src={value}
              alt=""
              fill
              sizes={variant === 'hero' ? '1200px' : '400px'}
              className="object-cover"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="px-3 py-1.5 bg-surface-base/90 backdrop-blur rounded-md font-body text-xs text-text-primary hover:bg-surface-base transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 bg-semantic-error/90 backdrop-blur rounded-md text-white hover:bg-semantic-error transition-colors"
              aria-label="Delete image"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          </div>
        </div>
      ) : (
        // No image: show drop zone
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isPending && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed transition-colors cursor-pointer',
            variant === 'hero' ? 'aspect-[16/9]' : 'aspect-[4/3]',
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-surface-overlay bg-surface-elevated hover:border-text-muted',
            isPending && 'cursor-not-allowed opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 size={32} className="text-accent animate-spin" />
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
                <p className="font-mono text-xs text-text-muted mt-1">
                  {variant === 'hero' ? '2400×1350' : variant === 'card' ? '800×600' : '1600×1200'} · WebP + AVIF
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
```

Notes:
- Auto-generates AVIF + WebP at appropriate sizes per variant
- Drag-and-drop with visual feedback
- Click to file picker fallback
- Preview shows the WebP URL (browsers fall back automatically)
- Replace + Delete actions on hover
- Loading state during upload (processing takes 1-3 seconds)
- Disabled state during pending operations

================================================================
TASK 8 — MULTI-IMAGE MANAGER (CAROUSEL)
================================================================

Create src/components/admin/products/ImageManager.tsx:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, GripVertical } from 'lucide-react'
import { uploadProductImage, deleteProductImage } from '@/server/admin-image-actions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface ImageManagerProps {
  label: string
  description?: string
  productSlug: string
  value: string[]              // array of URLs
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageManager({
  label,
  description,
  productSlug,
  value,
  onChange,
  maxImages = 8,
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startUpload] = useTransition()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!productSlug) {
      toast.error('Save the product slug first before uploading images')
      return
    }
    
    if (value.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images. Currently have ${value.length}.`)
      return
    }
    
    // Upload all files sequentially (avoid R2 rate limits)
    startUpload(async () => {
      const newUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue
        
        const formData = new FormData()
        formData.append('file', file)
        
        const result = await uploadProductImage(productSlug, 'carousel', formData)
        
        if (result.ok) {
          newUrls.push(result.result.url)
        } else {
          toast.error(`Failed: ${file.name} — ${result.error}`)
        }
      }
      
      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
        toast.success(`Uploaded ${newUrls.length} image${newUrls.length > 1 ? 's' : ''}`)
      }
    })
  }
  
  async function handleRemove(url: string, index: number) {
    if (!confirm('Remove this image?')) return
    
    const result = await deleteProductImage(url)
    
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    
    onChange(value.filter((_, i) => i !== index))
    toast.success('Image removed')
  }
  
  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }
  
  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newOrder = [...value]
    const dragged = newOrder.splice(draggedIndex, 1)[0]
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
        <label className="block font-body text-sm font-medium text-text-secondary">
          {label}
        </label>
        {description && (
          <p className="font-body text-xs text-text-muted mt-1">{description}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {value.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative group aspect-[4/3] rounded-md overflow-hidden bg-surface-elevated cursor-move',
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
            <div className="absolute top-1 left-1 p-1 bg-surface-base/80 backdrop-blur rounded text-text-muted">
              <GripVertical size={12} />
            </div>
            <div className="absolute top-1 right-1">
              <button
                type="button"
                onClick={() => handleRemove(url, index)}
                className="p-1 bg-semantic-error/90 backdrop-blur rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-surface-base/80 backdrop-blur rounded font-mono text-xs text-text-muted">
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
              'aspect-[4/3] flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
              isPending 
                ? 'border-surface-overlay opacity-50 cursor-not-allowed'
                : 'border-surface-overlay hover:border-text-muted cursor-pointer'
            )}
          >
            {isPending ? (
              <>
                <Loader2 size={20} className="text-accent animate-spin" />
                <p className="font-body text-xs text-text-secondary">Uploading...</p>
              </>
            ) : (
              <>
                <Upload size={20} className="text-text-muted" />
                <p className="font-body text-xs text-text-secondary">Add images</p>
                <p className="font-mono text-xs text-text-muted">{value.length}/{maxImages}</p>
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
```

================================================================
TASK 9 — UPDATE PRODUCT FORM
================================================================

Open src/components/admin/products/ProductForm.tsx. Find the Images 
section (the Card with title "Images" containing the text Inputs). 

Replace it with:

```tsx
{/* Images */}
<Card>
  <CardHeader>
    <CardTitle>Images</CardTitle>
    <CardDescription>
      {!values.slug 
        ? 'Save the product first to enable image uploads.'
        : 'Drag and drop images, or click to browse. AVIF + WebP variants are generated automatically.'}
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <ImageUpload
      label="Card image"
      description="Shown in product grids. Recommended: 4:3 aspect, high contrast."
      variant="card"
      productSlug={values.slug}
      value={values.cardImagePath}
      onChange={(url) => update('cardImagePath', url)}
    />
    
    <ImageUpload
      label="Hero image"
      description="Shown on the product detail page header. 16:9 aspect, dramatic composition."
      variant="hero"
      productSlug={values.slug}
      value={values.heroImagePath}
      onChange={(url) => update('heroImagePath', url)}
    />
    
    {values.tier === 'longtail' && (
      <ImageManager
        label="Carousel images"
        description="Additional product views for the long-tail tier. Drag to reorder. Max 8 images."
        productSlug={values.slug}
        value={values.photoCarouselPaths}
        onChange={(urls) => update('photoCarouselPaths', urls)}
        maxImages={8}
      />
    )}
  </CardContent>
</Card>
```

Add imports at the top:
```tsx
import { ImageUpload } from './ImageUpload'
import { ImageManager } from './ImageManager'
```

Notes:
- ImageManager only shows for longtail tier (carousel is tier-specific)
- All upload components are disabled when slug is empty (new product 
  before first save)
- Slug from form state used for R2 key organization

Also: the description text at the top changes based on whether slug 
is set, giving the user a clear UX hint.

================================================================
TASK 10 — UPDATE .env.example
================================================================

Open .env.example. Add the R2 section:

```
# Cloudflare R2 — image storage (Phase 7d)
# Setup guide: cloudflare-r2-setup-guide.md
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=dtech-showroom-images
R2_PUBLIC_URL=
```

Do NOT include actual values. These are placeholders for the next 
developer.

================================================================
TASK 11 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

If sharp install fails on the build server, the error will surface 
here. Common issues:
- Native binary missing: pnpm rebuild sharp
- Architecture mismatch: check that pnpm-lock.yaml has the right 
  platform entries

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Smoke tests:

Admin routes still redirect:
  $adminRoutes = @(
    '/admin/products',
    '/admin/products/new',
    '/admin/products/hp-omen-16-i9-rtx-4070/edit'
  )
  foreach ($r in $adminRoutes) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch {
      Write-Host "Redirect 307 $r"
    }
  }

Note: the edit route uses productId from the database. If you don't 
have a known productId at hand, sign in to /admin/products and grab 
an ID from there.

Public routes regression:
  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/about')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All should return 200.

Stop dev:
  Stop-Job $job; Remove-Job $job

Note: actual end-to-end upload testing requires the user to:
1. Sign in to /admin (env vars + seeded admin)
2. Edit an existing product
3. Drag an image into the card upload zone
4. Verify R2 dashboard shows the new objects
5. Verify the image renders on /products/[slug]

This manual test happens AFTER the Claude Code session, by the user. 
Don't try to script it here — the auth flow requires interactive 
signin.

================================================================
TASK 12 — COMMIT
================================================================

git add .
git commit -m "feat: phase 7d — image upload via Cloudflare R2

NEW DEPENDENCIES:
- @aws-sdk/client-s3 — S3-compatible R2 access
- sharp — native image processing for AVIF/WebP generation

INFRASTRUCTURE:
- src/lib/r2.ts — R2 client, key utilities, public URL builders
- src/lib/image-processing.ts — sharp pipeline with variant specs
  - card: 800×600 (WebP q82, AVIF q60)
  - hero: 2400×1350 (WebP q85, AVIF q65)
  - carousel: 1600×1200 (WebP q82, AVIF q60)
  - Smart cropping via libvips attention (saliency-based)
- src/server/admin-image-actions.ts — auth-guarded upload/delete

ADMIN UI:
- ImageUpload — drag-drop single image (card / hero variants)
  - Visual drop zone with hover state
  - Click fallback to file picker
  - Loading state during sharp processing + R2 upload
  - Replace + Delete actions on hover
  - Preview using next/image
- ImageManager — multi-image gallery (carousel variant)
  - Grid layout with reorder via HTML5 drag-and-drop
  - Sequential upload to respect R2 rate limits
  - Per-image delete + position indicator
  - Max 8 images enforced

PRODUCT FORM INTEGRATION:
- Replaced placeholder text Inputs in Images section
- ImageUpload for card + hero (all tiers)
- ImageManager for carousel (longtail tier only)
- All upload UI disabled until product slug is saved

R2 KEY STRUCTURE:
- products/[slug]/[variant]-[hash].[format]
- Examples:
  - products/hp-omen-16-i9-rtx-4070/card-a1b2c3d4.webp
  - products/hp-omen-16-i9-rtx-4070/card-a1b2c3d4.avif
  - products/hp-omen-16-i9-rtx-4070/hero-e5f6g7h8.webp
- Cache-Control: immutable (content-hashed URLs)

ENV VARS:
- R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME, R2_PUBLIC_URL
- Documented in .env.example

OUT OF SCOPE (Phase 7e+):
- Brand/category logo upload (Phase 7e — same pattern, different keys)
- User profile pictures (Phase 7e)
- 3D model upload (post-launch)
- Image cropping UI (Phase 7g if requested)
- AI alt text generation"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] sharp installed and binary present
- [ ] @aws-sdk/client-s3 installed
- [ ] R2 client utility module exists
- [ ] Image processing utility module exists
- [ ] Server actions for upload + delete exist with auth check
- [ ] ImageUpload component created
- [ ] ImageManager component created  
- [ ] ProductForm updated to use new components
- [ ] .env.example updated with R2 vars
- [ ] Admin product routes still redirect (regression)
- [ ] Public routes return 200 (regression)
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (especially ProductForm.tsx)
3. Bundle size impact (sharp + aws-sdk are server-only, should be 
   zero client impact)
4. Build verification outputs
5. Smoke test results
6. Any deviations from spec
7. Final commit hash
8. Reminder for user: actual upload testing requires signin

================================================================
DO NOT
================================================================

- Build brand/category/user image upload (Phase 7e)
- Add image cropping UI
- Add CDN invalidation logic (R2 handles via versioned URLs)
- Add 3D model upload (out of scope)
- Add direct browser uploads via presigned URLs (server-side is 
  simpler)
- Modify customer-facing image rendering (next/image handles it)
- Add new fields to products schema (the imagePath columns from 
  Phase 7c are sufficient)
- Generate AVIF/WebP at request time (we pre-generate at upload)
- Modify v2 brand spec
- Touch /motion or any (dev) routes

================================================================
FAILURE MODES TO WATCH
================================================================

- If sharp install fails: this is a native dependency. On Windows, 
  pnpm may need to download platform-specific binary. Confirm with:
    pnpm rebuild sharp
  If still failing, check pnpm version (8.x+ required) and Node 
  version (18+ required).

- If @aws-sdk/client-s3 import fails in server actions: the package 
  is large; ensure 'use server' is at top of admin-image-actions.ts. 
  Server actions can use Node modules; the bundle isn't shipped to 
  client.

- If R2 returns 403: API token permissions wrong. User should 
  regenerate with Object Read & Write on the specific bucket.

- If R2 returns NoSuchBucket: R2_BUCKET_NAME env var doesn't match 
  actual bucket name. Check .env.local for typos.

- If image processing is slow (>5 seconds): expected for large 
  source images on first load. sharp keeps a cached pipeline; 
  subsequent uploads of similar sizes should be faster.

- If upload component shows "Save the product slug first" but slug 
  IS set: the slug prop isn't propagating from ProductForm to 
  ImageUpload. Confirm the prop chain: values.slug → ImageUpload's 
  productSlug prop.

- If drag-drop doesn't show visual feedback: confirm onDragOver 
  calls preventDefault and stopPropagation BEFORE setState. Without 
  preventDefault, the browser intercepts the drag.

- If reorder in ImageManager is laggy: the onChange fires on every 
  dragOver — this is intentional for visual feedback but could 
  generate many DB writes if save-on-change is added later. For 
  Phase 7d, onChange just updates local state; save happens on 
  form submit.

- If R2 public URLs don't load images in browser: confirm R2 
  public access is enabled (step 4 of setup guide). Open the URL 
  directly in browser — should download the image. If 403 or 404, 
  re-enable public access on the bucket.

- If next/image refuses to render R2 URLs: add the R2 domain to 
  next.config.ts's images.remotePatterns:
  
  ```typescript
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
      // ... existing patterns
    ],
  }
  ```
  
  This is REQUIRED. Without it, next/image rejects the URLs as 
  untrusted. Pattern matching syntax allows wildcards.

- If AVIF generation is significantly slower than WebP: this is 
  normal. AVIF encoding is computationally expensive. The 'effort: 4' 
  setting is a balance — higher would compress better but take 
  longer. Don't reduce below 4.

- If files larger than 4.5MB fail in Next.js server action: Next.js 
  defaults to 1MB body size limit for server actions. Update 
  next.config.ts:
  
  ```typescript
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  ```

- If "Body" type errors on FormData.get('file'): TypeScript may 
  infer 'FormDataEntryValue | null' which is string | File | null. 
  The instanceof File check narrows correctly. If TS complains 
  about File not being defined in server context, ensure 
  tsconfig.json's lib includes 'DOM' (Next.js does this by default).

================================================================
NEXT.CONFIG.TS UPDATE REQUIRED
================================================================

The Phase 7d code uses next/image with R2 URLs. Without explicit 
allowlist, next/image will reject them.

Open next.config.ts (or next.config.mjs / next.config.js). Find the 
existing `images` config block. Add the R2 hostname pattern:

```typescript
images: {
  // ... existing config
  remotePatterns: [
    // ... existing patterns
    {
      protocol: 'https',
      hostname: 'pub-*.r2.dev',
    },
  ],
},
```

If existing config doesn't have an images block, add the whole block. 
The R2 hostname uses a wildcard prefix because pub-*.r2.dev has a 
randomly-assigned subdomain per bucket.

ALSO: add the body size limit for server actions:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '25mb',
  },
},
```

This allows the file upload server action to receive images up to 
25MB. Without it, the 1MB default truncates uploads.