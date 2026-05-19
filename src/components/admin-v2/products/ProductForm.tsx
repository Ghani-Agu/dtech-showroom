'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Field,
  Input,
  Textarea,
  Select,
  Tabs,
  TabsList,
  Tab,
  TabPanel,
} from '@/components/admin-v2/ui'
import { ImageManager } from '@/components/admin/products/ImageManager'
import { ImageUpload } from '@/components/admin/products/ImageUpload'
import { SpecsEditor } from '@/components/admin/products/SpecsEditor'
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

      toast.success(mode === 'create' ? 'Product created' : 'Product updated')

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
    <form ref={formRef} onSubmit={handleSubmit} className="pb-28">
      <Tabs defaultValue="basics">
        <TabsList>
          <Tab value="basics">Basics</Tab>
          <Tab value="content">Content</Tab>
          <Tab value="specs">Specs</Tab>
          <Tab value="media">Media</Tab>
          <Tab value="seo">SEO</Tab>
        </TabsList>

        {/* BASICS */}
        <TabPanel value="basics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Names</CardTitle>
                <CardDescription>
                  English is canonical. French is optional and falls back to
                  English when empty.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Name (English)"
                    error={errors.name?.[0]}
                    required
                  >
                    <Input
                      value={values.name}
                      onChange={(e) => update('name', e.target.value)}
                      error={!!errors.name}
                    />
                  </Field>
                  <Field
                    label="Name (French)"
                    error={errors.nameFr?.[0]}
                  >
                    <Input
                      value={values.nameFr ?? ''}
                      onChange={(e) => update('nameFr', e.target.value)}
                      error={!!errors.nameFr}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Tagline (English)">
                    <Input
                      value={values.tagline}
                      onChange={(e) => update('tagline', e.target.value)}
                    />
                  </Field>
                  <Field label="Tagline (French)">
                    <Input
                      value={values.taglineFr ?? ''}
                      onChange={(e) => update('taglineFr', e.target.value)}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Brand" error={errors.brandId?.[0]} required>
                    <Select
                      value={values.brandId}
                      onChange={(e) => update('brandId', e.target.value)}
                      error={!!errors.brandId}
                    >
                      <option value="">Select brand...</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Category"
                    error={errors.categoryId?.[0]}
                    required
                  >
                    <Select
                      value={values.categoryId}
                      onChange={(e) => update('categoryId', e.target.value)}
                      error={!!errors.categoryId}
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Tier"
                    description="Hero = cinematic, Featured = highlighted, Long-tail = standard."
                  >
                    <Select
                      value={values.tier}
                      onChange={(e) =>
                        update(
                          'tier',
                          e.target.value as 'hero' | 'featured' | 'longtail'
                        )
                      }
                    >
                      <option value="hero">Hero</option>
                      <option value="featured">Featured</option>
                      <option value="longtail">Long-tail</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <label className="flex cursor-pointer items-center gap-3 h-11">
                    <input
                      type="checkbox"
                      checked={values.featured}
                      onChange={(e) => update('featured', e.target.checked)}
                      className="h-4 w-4 rounded accent-admin-accent"
                    />
                    <span className="font-body text-sm text-admin-text-primary">
                      Featured on homepage
                    </span>
                  </label>
                  <Field
                    label="Sort order"
                    description="Lower numbers appear first."
                  >
                    <Input
                      type="number"
                      min={0}
                      max={9999}
                      value={values.sortOrder}
                      onChange={(e) =>
                        update('sortOrder', parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* CONTENT */}
        <TabPanel value="content">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
                <CardDescription>
                  Full editorial description shown on the product page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Description (English)">
                    <Textarea
                      rows={8}
                      value={values.description}
                      onChange={(e) => update('description', e.target.value)}
                    />
                  </Field>
                  <Field label="Description (French)">
                    <Textarea
                      rows={8}
                      value={values.descriptionFr ?? ''}
                      onChange={(e) =>
                        update('descriptionFr', e.target.value)
                      }
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card spec</CardTitle>
                <CardDescription>
                  Single-line summary shown on product cards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Card spec (English)">
                    <Input
                      value={values.cardSpec}
                      onChange={(e) => update('cardSpec', e.target.value)}
                    />
                  </Field>
                  <Field label="Card spec (French)">
                    <Input
                      value={values.cardSpecFr ?? ''}
                      onChange={(e) => update('cardSpecFr', e.target.value)}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search keywords</CardTitle>
                <CardDescription>
                  Space-separated keywords for search matching. Not shown to
                  customers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Keywords (English)">
                    <Input
                      value={values.searchKeywords}
                      onChange={(e) =>
                        update('searchKeywords', e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Keywords (French)">
                    <Input
                      value={values.searchKeywordsFr ?? ''}
                      onChange={(e) =>
                        update('searchKeywordsFr', e.target.value)
                      }
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* SPECS */}
        <TabPanel value="specs">
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>
                Key-value pairs rendered as a table on the product detail
                page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpecsEditor
                value={values.specs}
                onChange={(specs) => update('specs', specs)}
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* MEDIA */}
        <TabPanel value="media">
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
                description="Shown on the product detail page header. 16:9 aspect."
                variant="hero"
                entityType="product"
                entitySlug={values.slug}
                value={values.heroImagePath ?? ''}
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
        </TabPanel>

        {/* SEO */}
        <TabPanel value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO & URL</CardTitle>
              <CardDescription>
                Slug controls the public URL. SEO title/description override
                defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="URL slug"
                description="Lowercase, hyphens only. Example: hp-omen-16-i9-rtx-4070"
                error={errors.slug?.[0]}
                required
              >
                <div className="flex gap-2">
                  <Input
                    value={values.slug}
                    onChange={(e) => update('slug', e.target.value)}
                    error={!!errors.slug}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => update('slug', slugify(values.name))}
                    disabled={!values.name}
                  >
                    Auto-generate
                  </Button>
                </div>
              </Field>

              <Field
                label="SEO title"
                description="Max 120 chars. Defaults to product name."
              >
                <Input
                  value={values.seoTitle ?? ''}
                  onChange={(e) => update('seoTitle', e.target.value)}
                />
              </Field>

              <Field
                label="SEO description"
                description="Max 300 chars. Defaults to tagline."
              >
                <Textarea
                  rows={3}
                  value={values.seoDescription ?? ''}
                  onChange={(e) => update('seoDescription', e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Sticky save bar — sits below the 280px sidebar */}
      <div className="fixed bottom-0 left-[280px] right-0 z-20 border-t border-admin-border bg-admin-surface-raised/95 backdrop-blur">
        <div className="flex max-w-[1600px] items-center justify-between gap-3 px-8 lg:px-12 py-4">
          <div>
            {mode === 'edit' && !isArchived && (
              <Button
                type="button"
                variant="danger"
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
