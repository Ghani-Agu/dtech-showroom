/**
 * Dev-only skip-login endpoint — TESTING PHASE ONLY.
 *
 * GET /api/dev-login?redirect=/admin
 *
 * Creates (or reuses) a local "Dev Admin" account, promotes it to admin,
 * signs it in through better-auth, and forwards the real session cookie.
 * Every existing auth guard (proxy, layouts, server actions) keeps working
 * untouched — this just hands you a genuine admin session in one click.
 *
 * Security: returns 404 in production builds unless ALLOW_DEV_LOGIN=1 is
 * explicitly set. Never set that flag on the live deployment.
 */
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'

const DEV_EMAIL = 'dev-admin@dtech.local'
const DEV_NAME = 'Dev Admin'
const DEV_PASSWORD = 'dev-skip-login-2026'

function isEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEV_LOGIN === '1'
  )
}

export async function GET(request: Request) {
  if (!isEnabled()) {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = new URL(request.url)
  const redirectParam = url.searchParams.get('redirect') ?? '/admin'
  // Internal redirects only — no open-redirect via this endpoint.
  const target =
    redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/admin'

  try {
    // 1. Ensure the dev admin account exists.
    const existing = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, DEV_EMAIL))
      .limit(1)
      .then((rows) => rows[0])

    if (!existing) {
      await auth.api.signUpEmail({
        body: { email: DEV_EMAIL, name: DEV_NAME, password: DEV_PASSWORD },
      })
    }

    // 2. Make sure it has the admin role (covers fresh + pre-existing).
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, DEV_EMAIL))

    // 3. Sign in and capture the real session cookie.
    const signInRes = await auth.api.signInEmail({
      body: { email: DEV_EMAIL, password: DEV_PASSWORD },
      asResponse: true,
    })

    if (!signInRes.ok) {
      const body = await signInRes.text()
      return new NextResponse(
        `Dev login failed (${signInRes.status}): ${body}`,
        { status: 500 }
      )
    }

    // 4. Redirect to the target with the session cookie attached.
    const redirectRes = NextResponse.redirect(new URL(target, url.origin), 303)
    const cookies = signInRes.headers.getSetCookie()
    for (const cookie of cookies) {
      redirectRes.headers.append('set-cookie', cookie)
    }
    return redirectRes
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new NextResponse(`Dev login failed: ${message}`, { status: 500 })
  }
}
