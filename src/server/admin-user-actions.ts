'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sessions, users } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
} from '@/lib/validations/user'

export async function createUser(values: UserCreateValues) {
  await requireAdmin()

  const parsed = userCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    return {
      ok: false as const,
      errors: { email: ['A user with this email already exists'] },
    }
  }

  try {
    // The admin chooses the password — the employee signs in right away
    // with email + password (or "Continuer avec Google" on the same Gmail).
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
    })

    await db
      .update(users)
      .set({
        role: parsed.data.role,
        permissions:
          parsed.data.role === 'admin' ? null : parsed.data.permissions,
      })
      .where(eq(users.email, parsed.data.email))

    revalidatePath('/admin/users')

    return { ok: true as const }
  } catch (err) {
    console.error('[user-create] Failed:', err)
    return {
      ok: false as const,
      errors: { _form: ["Échec de la création du compte"] },
    }
  }
}

export async function updateUser(
  userId: string,
  values: UserUpdateValues
) {
  const admin = await requireAdmin()

  if (admin.id === userId && values.role !== 'admin') {
    return {
      ok: false as const,
      errors: { role: ['You cannot remove your own admin role'] },
    }
  }

  const parsed = userUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      role: parsed.data.role,
      permissions:
        parsed.data.role === 'admin' ? null : parsed.data.permissions,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}/edit`)

  return { ok: true as const }
}

export async function deactivateUser(userId: string) {
  const admin = await requireAdmin()

  if (admin.id === userId) {
    return {
      ok: false as const,
      error: 'You cannot deactivate yourself' as const,
    }
  }

  await db
    .update(users)
    .set({ deactivatedAt: new Date() })
    .where(eq(users.id, userId))

  await db.delete(sessions).where(eq(sessions.userId, userId))

  revalidatePath('/admin/users')

  return { ok: true as const }
}

export async function reactivateUser(userId: string) {
  await requireAdmin()

  await db
    .update(users)
    .set({ deactivatedAt: null })
    .where(eq(users.id, userId))

  revalidatePath('/admin/users')

  return { ok: true as const }
}

export async function triggerPasswordReset(userId: string) {
  await requireAdmin()

  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0])

  if (!user) {
    return { ok: false as const, error: 'User not found' as const }
  }

  await auth.api
    .requestPasswordReset({
      body: {
        email: user.email,
        redirectTo: '/reset-password',
      },
    })
    .catch((err) => {
      console.error('[password-reset] Failed:', err)
    })

  return { ok: true as const }
}
