'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Select,
} from '@/components/admin-v2/ui'
import { createProduct } from '@/server/admin-product-actions'
import { toast } from '@/lib/toast'

interface Props {
  brands: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewProductForm({ brands, categories }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tier, setTier] = useState<'hero' | 'featured' | 'longtail'>(
    'longtail'
  )
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>(
    {}
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    const slug = slugify(name)

    startTransition(async () => {
      const result = await createProduct({
        slug,
        name,
        tagline: '',
        description: '',
        cardSpec: '',
        searchKeywords: '',
        nameFr: '',
        taglineFr: '',
        descriptionFr: '',
        cardSpecFr: '',
        searchKeywordsFr: '',
        brandId,
        categoryId,
        tier,
        featured: false,
        sortOrder: 100,
        specs: {},
        cardImagePath: '',
        heroImagePath: '',
        glbModelPath: '',
        photoCarouselPaths: [],
        seoTitle: '',
        seoDescription: '',
      })

      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Please fix the errors below.')
        return
      }

      toast.success('Product created — now fill in the details.')

      if ('id' in result) {
        router.push(`/admin/products/${result.id}/edit`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card>
        <CardContent className="space-y-4">
          <Field
            label="Product name"
            description="The English name. Slug, French translations, and other details can be filled in after."
            error={errors.name?.[0] || errors.slug?.[0]}
            required
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HP Omen 16 i9 RTX 4070"
              autoFocus
              error={!!(errors.name || errors.slug)}
            />
          </Field>

          <Field label="Brand" error={errors.brandId?.[0]} required>
            <Select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
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
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as 'hero' | 'featured' | 'longtail')
              }
            >
              <option value="hero">Hero</option>
              <option value="featured">Featured</option>
              <option value="longtail">Long-tail</option>
            </Select>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/products')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Create product
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
