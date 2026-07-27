'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { users } from '@/db/schema'

const nameSchema = z.string().trim().min(2).max(100)
const passwordSchema = z.string().min(8).max(200)

interface ActionResult {
  ok: boolean
  error?: string
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    return { ok: false, error: 'Not signed in' }
  }

  const parsed = nameSchema.safeParse(formData.get('name'))
  if (!parsed.success) {
    return { ok: false, error: 'Name must be 2 to 100 characters' }
  }

  await db
    .update(users)
    .set({ name: parsed.data, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true }
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    return { ok: false, error: 'Not signed in' }
  }

  const currentRaw = formData.get('currentPassword')
  const newRaw = formData.get('newPassword')

  const currentParsed = z.string().min(1).safeParse(currentRaw)
  const newParsed = passwordSchema.safeParse(newRaw)

  if (!currentParsed.success) {
    return { ok: false, error: 'Current password is required' }
  }
  if (!newParsed.success) {
    return { ok: false, error: 'New password must be at least 8 characters' }
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: currentParsed.data,
        newPassword: newParsed.data,
      },
    })
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to change password'
    return { ok: false, error: message }
  }
}
