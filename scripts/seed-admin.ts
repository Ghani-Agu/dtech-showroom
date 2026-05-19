/**
 * Seed the initial admin user. Run with:
 *   pnpm db:seed-admin
 *
 * Reads INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_PASSWORD
 * from .env.local. If any are missing, prompts interactively.
 *
 * Creates the user with admin role. If a user with the same email
 * already exists, promotes them to admin instead of recreating.
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { eq } from 'drizzle-orm'
import { auth } from '../src/lib/auth'
import { db } from '../src/db/client'
import { users } from '../src/db/schema'

async function prompt(
  question: string,
  defaultValue?: string
): Promise<string> {
  const rl = createInterface({ input, output })
  const suffix = defaultValue ? ` [${defaultValue}]` : ''
  const answer = await rl.question(`${question}${suffix}: `)
  rl.close()
  return answer.trim() || (defaultValue ?? '')
}

async function main() {
  console.log('━'.repeat(60))
  console.log('Dtech Showroom — Admin User Seed')
  console.log('━'.repeat(60))
  console.log('')

  let email = process.env.INITIAL_ADMIN_EMAIL ?? ''
  let name = process.env.INITIAL_ADMIN_NAME ?? ''
  let password = process.env.INITIAL_ADMIN_PASSWORD ?? ''

  if (!email) email = await prompt('Email')
  if (!name) name = await prompt('Name')
  if (!password) password = await prompt('Password')

  if (!email || !name || !password) {
    console.error('✗ Email, name, and password are all required')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('✗ Password must be at least 8 characters')
    process.exit(1)
  }

  if (password.length < 12) {
    console.warn('⚠ WARNING: Password is shorter than 12 characters.')
    console.warn('  Consider using a stronger password for production.')
    console.warn('')
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    console.log(`✓ User ${email} already exists (id: ${existing.id})`)
    if (existing.role !== 'admin') {
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, existing.id))
      console.log(`✓ Promoted ${email} to admin role`)
    } else {
      console.log(`✓ User is already admin`)
    }
    process.exit(0)
  }

  console.log(`→ Creating admin user ${email}...`)

  const result = await auth.api
    .signUpEmail({ body: { email, name, password } })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error('✗ signUpEmail failed:', message)
      return null
    })

  if (!result || !result.user) {
    console.error('✗ Failed to create admin user')
    process.exit(1)
  }

  await db
    .update(users)
    .set({ role: 'admin' })
    .where(eq(users.id, result.user.id))

  console.log('')
  console.log('━'.repeat(60))
  console.log('✓ Admin user created successfully')
  console.log(`  Email:  ${email}`)
  console.log(`  Name:   ${name}`)
  console.log(`  Role:   admin`)
  console.log(`  ID:     ${result.user.id}`)
  console.log('━'.repeat(60))
  console.log('')
  console.log('Sign in at /login with the credentials above.')

  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Unhandled error:', err)
  process.exit(1)
})
