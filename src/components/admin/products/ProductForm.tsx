'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { Button } from '@/components/admin/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Input'
import { Textarea } from '@/components/admin/ui/Textarea'
import { BilingualField } from './BilingualField'
import { ImageManager } from './ImageManager'
import { ImageUpload } from './ImageUpload'
import { SpecsEditor } from './SpecsEditor'
import {
  archiveProduct,
  createProduct,
  restoreProduct,
  updateProduct,
} from '@/server/admin-product-actions'
import { toast } from '@/lib/toast'
import type { ProductFormValues } from '@/lib/validations/product'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  initialValues?: ProductFormValues
  isArchived?: boolean
  brands: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
}

const defaultValues: ProductFormValues = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  cardSpec: '',
  searchKeywords: '',
  nameFr: '',
  taglineFr: '',
  descriptionFr: '',
  cardSpecFr: '',
  searchKeywordsFr: '',
  brandId: '',
  categoryId: '',
  tier: 'longtail',
  featured: false,
  sortOrder: 100,
  specs: {},
  cardImagePath: '',
  heroImagePath: '',
  glbModelPath: '',
  photoCarouselPaths: [],
  seoTitle: '',
  seoDescription: '',
}

type FieldErrors = Record<string, string[] | undefined>

export function ProductForm({
  mode,
  productId,
  initialValues,
  isArchived = false,
  brands,
  categories,
}: ProductFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<ProductFormValues>(
    initialValues ?? defaultValues
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  useKeyboardShortcut({
    key: 's',
    modifiers: ['cmd'],
    handler: () => {
      formRef.current?.requestSubmit()
    },
  })

  function update<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createProduct(values)
          : await updateProduct(productId!, values)

      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Please fix the errors below.')
        return
      }

      toast.success(
        mode === 'create' ? 'Product created' : 'Product updated'
      )

      if (mode === 'create' && 'id' in result) {
        router.push(`/admin/products/${result.id}/edit`)
      } else {
        router.refresh()
      }
    })
  }

  function handleArchive() {
    if (!productId) return
    if (
      !confirm(
        'Archive this product? It will be hidden from the catalog but kept in the database.'
      )
    )
      return

    startTransition(async () => {
      const result = await archiveProduct(productId)
      if (result.ok) {
        toast.success('Product archived')
        router.refresh()
      } else {
        toast.error('Failed to archive')
      }
    })
  }

  function handleRestore() {
    if (!productId) return

    startTransition(async () => {
      const result = await restoreProduct(productId)
      if (result.ok) {
        toast.success('Product restored')
        router.refresh()
      } else {
        toast.error('Failed to restore')
      }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 pb-24"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            URL slug and English name. These define how the product is found.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="URL slug"
            description="Lowercase, hyphens only. Example: hp-omen-16-i9-rtx-4070"
            value={values.slug}
            onChange={(e) => update('slug', e.target.value)}
            error={errors.slug?.[0]}
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            English is the canonical version (required). French is optional —
            when empty, the public site falls back to English.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            label="Name"
            description="The product name as shown on cards and headings."
            required
            enValue={values.name}
            frValue={values.nameFr}
            onEnChange={(v) => update('name', v)}
            onFrChange={(v) => update('nameFr', v)}
            enError={errors.name?.[0]}
            frError={errors.nameFr?.[0]}
            type="input"
          />

          <BilingualField
            label="Tagline"
            description="Short, evocative phrase shown beneath the name."
            enValue={values.tagline}
            frValue={values.taglineFr}
            onEnChange={(v) => update('tagline', v)}
            onFrChange={(v) => update('taglineFr', v)}
            type="input"
          />

          <BilingualField
            label="Card spec"
            description="One-line spec summary shown on product cards. E.g. Intel i9-13900HX · 32GB"
            enValue={values.cardSpec}
            frValue={values.cardSpecFr}
            onEnChange={(v) => update('cardSpec', v)}
            onFrChange={(v) => update('cardSpecFr', v)}
            type="input"
          />

          <BilingualField
            label="Description"
            description="Full editorial description shown on the product detail page."
            enValue={values.description}
            frValue={values.descriptionFr}
            onEnChange={(v) => update('description', v)}
            onFrChange={(v) => update('descriptionFr', v)}
            type="textarea"
            rows={6}
          />

          <BilingualField
            label="Search keywords"
            description="Space-separated keywords for search matching. Not shown to customers."
            enValue={values.searchKeywords}
            frValue={values.searchKeywordsFr}
            onEnChange={(v) => update('searchKeywords', v)}
            onFrChange={(v) => update('searchKeywordsFr', v)}
            type="input"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Brand
            </label>
            <select
              value={values.brandId}
              onChange={(e) => update('brandId', e.target.value)}
              required
              className="w-full rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select brand...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brandId && (
              <p className="font-body text-sm text-semantic-error">
                {errors.brandId[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Category
            </label>
            <select
              value={values.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              required
              className="w-full rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="font-body text-sm text-semantic-error">
                {errors.categoryId[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Presentation tier
            </label>
            <select
              value={values.tier}
              onChange={(e) =>
                update(
                  'tier',
                  e.target.value as 'hero' | 'featured' | 'longtail'
                )
              }
              required
              className="w-full rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="hero">Hero — cinematic stage</option>
              <option value="featured">Featured — functional viewer</option>
              <option value="longtail">Long-tail — photo carousel</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => update('featured', e.target.checked)}
              className="h-4 w-4 rounded accent-accent"
            />
            <span className="font-body text-sm text-text-primary">
              Featured on homepage
            </span>
          </label>

          <Input
            label="Sort order"
            description="Lower numbers appear first. Default 100."
            type="number"
            min={0}
            max={9999}
            value={values.sortOrder}
            onChange={(e) =>
              update('sortOrder', parseInt(e.target.value, 10) || 0)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
          <CardDescription>
            Technical specs rendered as a table on the product detail page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpecsEditor
            value={values.specs}
            onChange={(specs) => update('specs', specs)}
          />
        </CardContent>
      </Card>

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
            entityType="product"
            entitySlug={values.slug}
            value={values.cardImagePath}
            onChange={(url) => update('cardImagePath', url)}
          />

          <ImageUpload
            label="Hero image"
            description="Shown on the product detail page header. 16:9 aspect, dramatic composition."
            variant="hero"
            entityType="product"
            entitySlug={values.slug}
            value={values.heroImagePath}
            onChange={(url) => update('heroImagePath', url)}
          />

          {values.tier === 'longtail' && (
            <ImageManager
              label="Carousel images"
              description="Additional product views for the long-tail tier. Drag to reorder. Max 8 images."
              entityType="product"
              entitySlug={values.slug}
              value={values.photoCarouselPaths}
              onChange={(urls) => update('photoCarouselPaths', urls)}
              maxImages={8}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>
            Override defaults for meta title and description. Leave blank to
            use name and tagline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="SEO title"
            description="Max 120 chars. Defaults to product name."
            value={values.seoTitle}
            onChange={(e) => update('seoTitle', e.target.value)}
          />
          <Textarea
            label="SEO description"
            description="Max 300 chars. Defaults to tagline."
            rows={2}
            value={values.seoDescription}
            onChange={(e) => update('seoDescription', e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-60 right-0 z-10 border-t border-surface-overlay bg-surface-base/95 backdrop-blur">
        <div className="flex max-w-5xl items-center justify-between gap-3 px-8 py-4">
          <div>
            {mode === 'edit' && !isArchived && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleArchive}
                disabled={isPending}
              >
                Archive product
              </Button>
            )}
            {mode === 'edit' && isArchived && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRestore}
                disabled={isPending}
              >
                Restore product
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/products')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {mode === 'create' ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
