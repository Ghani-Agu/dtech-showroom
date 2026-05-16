import { z } from 'zod'

const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only',
  })

export const categoryFormSchema = z.object({
  slug: slugSchema,

  name: z.string().min(1).max(120),
  description: z.string().max(3000).optional().default(''),
  searchKeywords: z.string().max(300).optional().default(''),

  nameFr: z.string().max(120).optional().default(''),
  descriptionFr: z.string().max(3000).optional().default(''),
  searchKeywordsFr: z.string().max(300).optional().default(''),

  sortOrder: z.number().int().min(0).max(9999).default(100),

  heroImagePath: z.string().max(500).optional().default(''),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
