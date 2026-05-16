'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { BilingualField } from '@/components/admin/products/BilingualField'
import { ImageUpload } from '@/components/admin/products/ImageUpload'
import { Button } from '@/components/admin/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Input'
import {
  archiveBrand,
  createBrand,
  restoreBrand,
  updateBrand,
} from '@/server/admin-brand-actions'
import { toast } from '@/lib/toast'
import type { BrandFormValues } from '@/lib/validations/brand'

interface BrandFormProps {
  mode: 'create' | 'edit'
  brandId?: string
  initialValues?: BrandFormValues
  isArchived?: boolean
}

const defaultValues: BrandFormValues = {
  slug: '',
  name: '',
  statement: '',
  description: '',
  searchKeywords: '',
  nameFr: '',
  statementFr: '',
  descriptionFr: '',
  searchKeywordsFr: '',
  sortOrder: 100,
  logoPath: '',
  heroImagePath: '',
}

type FieldErrors = Record<string, string[] | undefined>

export function BrandForm({
  mode,
  brandId,
  initialValues,
  isArchived = false,
}: BrandFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<BrandFormValues>(
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

  function update<K extends keyof BrandFormValues>(
    key: K,
    value: BrandFormValues[K]
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
          ? await createBrand(values)
          : await updateBrand(brandId!, values)

      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Please fix the errors below.')
        return
      }

      toast.success(mode === 'create' ? 'Brand created' : 'Brand updated')

      if (mode === 'create' && 'id' in result) {
        router.push(`/admin/brands/${result.id}/edit`)
      } else {
        router.refresh()
      }
    })
  }

  function handleArchive() {
    if (!brandId) return
    if (
      !confirm(
        'Archive this brand? It will be hidden from the public site.'
      )
    )
      return

    startTransition(async () => {
      const result = await archiveBrand(brandId)
      if (result.ok) {
        toast.success('Brand archived')
        router.refresh()
      } else {
        toast.error('Failed to archive')
      }
    })
  }

  function handleRestore() {
    if (!brandId) return

    startTransition(async () => {
      const result = await restoreBrand(brandId)
      if (result.ok) {
        toast.success('Brand restored')
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
            URL slug used in /brands/[slug].
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="URL slug"
            description="Lowercase, hyphens only. Example: hp"
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
            English is canonical. French is optional — falls back to English
            when empty.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualField
            label="Name"
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
            label="Statement"
            description="One-line brand statement shown on the brand landing page."
            enValue={values.statement}
            frValue={values.statementFr}
            onEnChange={(v) => update('statement', v)}
            onFrChange={(v) => update('statementFr', v)}
            type="input"
          />

          <BilingualField
            label="Description"
            description="Editorial description shown on the brand landing page."
            enValue={values.description}
            frValue={values.descriptionFr}
            onEnChange={(v) => update('description', v)}
            onFrChange={(v) => update('descriptionFr', v)}
            type="textarea"
            rows={5}
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
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle>Images</CardTitle>
          <CardDescription>
            {!values.slug
              ? 'Save the brand first to enable image uploads.'
              : 'Drag and drop images, or click to browse.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            label="Logo"
            description="Square logo, transparent background recommended. 600×600."
            variant="logo"
            entityType="brand"
            entitySlug={values.slug}
            value={values.logoPath}
            onChange={(url) => update('logoPath', url)}
          />

          <ImageUpload
            label="Hero image"
            description="16:9 hero shown on the brand landing page."
            variant="hero"
            entityType="brand"
            entitySlug={values.slug}
            value={values.heroImagePath}
            onChange={(url) => update('heroImagePath', url)}
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
                Archive brand
              </Button>
            )}
            {mode === 'edit' && isArchived && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRestore}
                disabled={isPending}
              >
                Restore brand
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/brands')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {mode === 'create' ? 'Create brand' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
