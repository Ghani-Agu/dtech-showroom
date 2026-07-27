import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { auth } from './auth'
import { hasAccess, type SectionKey } from './permissions'

/**
 * Session + user row for the current request. Wrapped in React cache() so
 * the admin layout, the page and any server actions rendered in the same
 * request share ONE lookup instead of each paying their own session +
 * users queries. The session part itself is additionally served from the
 * better-auth cookie cache (see auth.ts) — most admin renders now cost a
 * single users-table query, and role/permission changes still apply
 * immediately because that query never caches across requests.
 *
 * NOTE on the catches below: a DB failure here is indistinguishable from
 * "not signed in" to every caller, so the whole app silently behaves as if
 * the visitor were logged out — sign in works, then /admin bounces straight
 * back to /login. That is how the 2026-07-27 connection-pool exhaustion
 * presented itself. The errors are now logged explicitly so the cause is
 * visible in the server output instead of being swallowed.
 */
export const getSessionUser = cache(async () => {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch((err) => {
      console.error(
        '[auth] getSession failed — treating the request as signed out. ' +
          'If this repeats, the database is unreachable, not the password:',
        err
      )
      return null
    })

  if (!session) return null

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
      permissions: users.permissions,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0])
    .catch((err) => {
      console.error(
        '[auth] users lookup failed for a VALID session — the visitor will ' +
          'be treated as signed out. Database problem, not an auth problem:',
        err
      )
      return null
    })

  return user ?? null
})

export async function requireSession() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/** Session + per-section permission gate (admins pass everything). */
export async function requireSection(section: SectionKey) {
  const user = await requireSession()
  if (!hasAccess(user, section)) {
    throw new Error(`Forbidden: accès « ${section} » requis`)
  }
  return user
}

export async function requireAdmin() {
  const user = await requireSession()
  if (user.role !== 'admin') {
    throw new Error('Forbidden: admin role required')
  }
  return user
}
