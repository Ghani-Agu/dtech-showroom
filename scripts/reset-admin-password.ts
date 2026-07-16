/**
 * Reset (or set) admin password(s) so email + password sign-in works at /login.
 *
 * Uses better-auth's OWN hashing (via auth.$context), so the stored hash is
 * exactly what the login endpoint verifies against. Self-verifies at the end.
 *
 * Run locally (uses the DATABASE_URL in your .env.local — i.e. production):
 *   pnpm tsx --env-file=.env.local scripts/reset-admin-password.ts
 *
 * Optional overrides:
 *   RESET_EMAIL=you@example.com RESET_PASSWORD='NewPass123!' \
 *     pnpm tsx --env-file=.env.local scripts/reset-admin-password.ts
 */
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { auth } from '../src/lib/auth'
import { db } from '../src/db/client'
import { users, accounts } from '../src/db/schema'

// Both admin logins are set to the same known password unless you override it.
const DEFAULT_TARGETS = [
  { email: 'abdelghani.ague@gmail.com', name: 'Ghani' },
  { email: 'dtech.dev26@gmail.com', name: 'Dtech Dev' },
]
const PASSWORD = process.env.RESET_PASSWORD || 'DtechDev26!Kq9'

async function upsertAdmin(
  email: string,
  name: string,
  hashed: string,
  verify: (args: { password: string; hash: string }) => Promise<boolean>
) {
  email = email.toLowerCase()

  let user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((r) => r[0])

  if (!user) {
    const id = randomUUID()
    await db.insert(users).values({
      id,
      email,
      name,
      emailVerified: true,
      role: 'admin',
    })
    user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((r) => r[0])
    console.log(`  + created user ${email}`)
  } else if (user.role !== 'admin') {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
    console.log(`  ↑ promoted ${email} to admin`)
  }

  if (!user) throw new Error(`could not load/create user ${email}`)

  const cred = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential'))
    )
    .limit(1)
    .then((r) => r[0])

  if (cred) {
    await db
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(accounts.id, cred.id))
    console.log(`  ✓ reset password for ${email}`)
  } else {
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: user.id,
      accountId: user.id, // better-auth convention for the credential provider
      providerId: 'credential',
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`  ✓ set new password (credential) for ${email}`)
  }

  // Self-verify: read the stored hash back and confirm it validates the password.
  const stored = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential'))
    )
    .limit(1)
    .then((r) => r[0])
  const ok =
    !!stored?.password &&
    (await verify({ password: PASSWORD, hash: stored.password }))
  console.log(`  ${ok ? '✓' : '✗'} verify: ${ok ? 'password OK' : 'FAILED'}`)
  if (!ok) throw new Error(`verification failed for ${email}`)
}

async function main() {
  const ctx = (await auth.$context) as unknown as {
    password: {
      hash: (p: string) => Promise<string>
      verify: (a: { password: string; hash: string }) => Promise<boolean>
    }
  }
  const hashed = await ctx.password.hash(PASSWORD)

  const targets = process.env.RESET_EMAIL
    ? [{ email: process.env.RESET_EMAIL, name: process.env.RESET_NAME || 'Admin' }]
    : DEFAULT_TARGETS

  console.log('Resetting admin password(s)…\n')
  for (const t of targets) {
    await upsertAdmin(t.email, t.name, hashed, ctx.password.verify)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Done. Sign in at /login with:')
  for (const t of targets) console.log(`  ${t.email}`)
  console.log(`  password: ${PASSWORD}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
