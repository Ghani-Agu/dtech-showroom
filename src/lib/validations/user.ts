import { z } from 'zod'

export const userCreateSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'staff']),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'staff']),
})

export type UserCreateValues = z.infer<typeof userCreateSchema>
export type UserUpdateValues = z.infer<typeof userUpdateSchema>
