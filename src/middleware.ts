import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Node runtime — better-auth needs DB access (postgres-js, Drizzle) which
// doesn't bundle for the Edge runtime.
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

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

export const config = {
  matcher: ['/admin/:path*'],
}
