import { createAuthClient } from 'better-auth/react'

/**
 * Auth client base URL.
 *
 * In the browser we ALWAYS use the origin the page is actually served from.
 * The previous version baked `NEXT_PUBLIC_SITE_URL` in at build time and fell
 * back to `http://localhost:3000`, which broke login in three real ways:
 *
 *  1. If the env var was missing at build time, an https page POSTed to
 *     http://localhost:3000 — blocked as mixed content, surfacing as
 *     "TypeError: Failed to fetch" with the button stuck on "Connexion…".
 *  2. On any origin OTHER than the baked one — a Vercel preview URL, a custom
 *     domain, `www.`, a phone reaching a different host — the request went
 *     cross-origin, so the session cookie was set on the baked origin and the
 *     browser actually in use never received it. Login looked like it worked,
 *     then bounced straight back to /login.
 *  3. `NEXT_PUBLIC_*` is inlined at build time, so correcting the env var
 *     still needed a cache-free rebuild before it took effect.
 *
 * Same-origin also keeps the cookie first-party, which matters as browsers
 * keep tightening third-party cookie rules.
 *
 * The server still checks the origin against `trustedOrigins` in auth.ts, so
 * this doesn't widen what's accepted — it stops the client sending the
 * request to the wrong place.
 */
function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000'
  )
}

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
})

export const { signIn, signOut, signUp, useSession } = authClient
