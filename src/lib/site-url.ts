/**
 * site-url — the ONE place that answers "what is this site's public origin?".
 *
 * ROUND 24. This used to be duplicated: `campaign-send-core.ts` had a proper
 * resolver (env → Vercel production host → localhost) while
 * `newsletter-actions.ts` had `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`.
 * With `NEXT_PUBLIC_SITE_URL` unset — which it was — every newsletter
 * confirmation email went out with a `http://localhost:3000/...` confirm link.
 * The visitor clicked it, nothing happened, they stayed `pending` forever, and
 * because campaigns only target `subscribed` they never showed up anywhere in
 * the marketing screens. Read from env at CALL time, never at module load, so
 * a value added on Vercel takes effect on the next request.
 */

export function getSiteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  /* Vercel injects these; the production host is the right one for emails —
     a preview-deployment URL would rot as soon as the deployment is replaced. */
  const prod = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim()
  if (prod) return `https://${prod.replace(/\/+$/, '')}`

  const any = (process.env.VERCEL_URL ?? '').trim()
  if (any) return `https://${any.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}

/**
 * True when the resolved origin can actually be clicked by someone who is not
 * sitting at this machine. Guards the "your confirmation link is broken"
 * warning in the admin — a link to localhost in a customer's inbox is worse
 * than no email at all, because it looks like it worked.
 */
export function isPublicSiteUrl(url: string = getSiteUrl()): boolean {
  return !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(url.trim())
}
