import 'server-only'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { auth } from './auth'

export async function getSessionUser() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) return null

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  return user ?? null
}

export async function requireSession() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin() {
  const user = await requireSession()
  if (user.role !== 'admin') {
    throw new Error('Forbidden: admin role required')
  }
  return user
}
