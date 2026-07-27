import { z } from 'zod'

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only, no special characters',
  })

const tierSchema = z.enum(['hero', 'featured', 'longtail'])

const specsSchema = z
  .record(
    z.string(),
    z.union([z.string(), z.number(), z.array(z.string())])
  )
  .default({})

export const productFormSchema = z.object({
  slug: slugSchema,

  name: z.string().min(2).max(200),
  tagline: z.string().max(200).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  cardSpec: z.string().max(120).optional().default(''),
  searchKeywords: z.string().max(500).optional().default(''),

  nameFr: z.string().max(200).optional().default(''),
  taglineFr: z.string().max(200).optional().default(''),
  descriptionFr: z.string().max(5000).optional().default(''),
  cardSpecFr: z.string().max(120).optional().default(''),
  searchKeywordsFr: z.string().max(500).optional().default(''),

  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  tier: tierSchema,

  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(100),

  specs: specsSchema,

  cardImagePath: z.string().max(500).optional().default(''),
  heroImagePath: z.string().max(500).optional().default(''),
  glbModelPath: z.string().max(500).optional().default(''),
  photoCarouselPaths: z.array(z.string().max(500)).max(8).default([]),

  seoTitle: z.string().max(120).optional().default(''),
  seoDescription: z.string().max(300).optional().default(''),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
