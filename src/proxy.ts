import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { auth } from '@/lib/auth'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes + the full-screen web editor: protect with auth, do NOT
  // apply locale routing (the editor opens in its own tab at /editor).
  if (pathname.startsWith('/admin') || pathname.startsWith('/editor')) {
    const session = await auth.api
      .getSession({ headers: request.headers })
      .catch(() => null)

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
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
