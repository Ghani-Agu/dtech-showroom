'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { users } from '@/db/schema'

export async function updateProfile(formData: FormData) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) return { ok: false as const, error: 'Not signed in' }

  const name = formData.get('name')?.toString().trim()
  if (!name || name.length < 2) {
    return {
      ok: false as const,
      error: 'Name must be at least 2 characters',
    }
  }

  await db.update(users).set({ name }).where(eq(users.id, session.user.id))

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true as const }
}

export async function changePasswordAction(formData: FormData) {
  const currentPassword = formData.get('currentPassword')?.toString()
  const newPassword = formData.get('newPassword')?.toString()

  if (!currentPassword || !newPassword) {
    return { ok: false as const, error: 'All fields are required' }
  }

  if (newPassword.length < 8) {
    return {
      ok: false as const,
      error: 'New password must be at least 8 characters',
    }
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword },
    })
    return { ok: true as const }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to change password'
    return { ok: false as const, error: message }
  }
}
