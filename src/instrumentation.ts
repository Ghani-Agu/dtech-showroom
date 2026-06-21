/**
 * Runs once when the Next.js server boots (dev and production).
 * Used to self-apply small additive DB migrations — no manual
 * `pnpm db:push` needed for the recent admin features.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { ensureSchema } = await import('@/db/ensure-schema')
  await ensureSchema()
}
