import { z } from 'zod'

const permissionsSchema = z
  .array(
    z.enum([
      'products',
      'categories',
      'brands',
      'inquiries',
      'newsletter',
      'editor',
    ])
  )
  .max(8)

export const userCreateSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(120),
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .max(128),
  role: z.enum(['admin', 'staff']),
  permissions: permissionsSchema.default([]),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'staff']),
  permissions: permissionsSchema.default([]),
})

export type UserCreateValues = z.infer<typeof userCreateSchema>
export type UserUpdateValues = z.infer<typeof userUpdateSchema>
