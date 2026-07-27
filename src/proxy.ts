import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { getSessionCookie } from 'better-auth/cookies'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes + the full-screen web editor: cheap cookie-presence gate.
  // The REAL session validation happens in the admin/editor layouts
  // (requireSession → DB). Doing a full auth.api.getSession() here meant a
  // database query on every single admin navigation — the main reason the
  // back-office felt slow. A missing/expired cookie still redirects here;
  // a forged cookie is rejected by the layout check.
  if (pathname.startsWith('/admin') || pathname.startsWith('/editor')) {
    const sessionCookie = getSessionCookie(request)

    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // Round 16: public self-registration is disabled — visitors subscribe to
  // the newsletter instead of creating accounts. The admin's « Créer un
  // compte » uses a SERVER-side auth.api.signUpEmail call that never goes
  // through this middleware, so blocking the HTTP endpoint costs nothing.
  if (pathname.startsWith('/api/auth/sign-up')) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Auth-adjacent routes: pass through (not localized)
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  // /motion — internal dev tool, kept at root, not localized
  if (pathname === '/motion' || pathname.startsWith('/motion/')) {
    return NextResponse.next()
  }

  // Customer-facing routes: apply locale proxy
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Match everything EXCEPT static assets, _next, _vercel, and files with extensions
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
}
