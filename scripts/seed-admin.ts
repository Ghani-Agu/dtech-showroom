import { eq } from 'drizzle-orm'
import { auth } from '../src/lib/auth'
import { db } from '../src/db/client'
import { users } from '../src/db/schema'

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL
  const name = process.env.INITIAL_ADMIN_NAME
  const password = process.env.INITIAL_ADMIN_PASSWORD

  if (!email || !name || !password) {
    console.error(
      'Missing INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, or INITIAL_ADMIN_PASSWORD'
    )
    process.exit(1)
  }

  if (password.length < 12) {
    console.error('INITIAL_ADMIN_PASSWORD must be at least 12 characters')
    process.exit(1)
  }

  console.log(`Creating initial admin: ${email}`)

  const result = await auth.api
    .signUpEmail({
      body: { email, password, name },
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error('signUpEmail failed:', message)
      return null
    })

  if (!result) {
    console.error('Failed to create admin user')
    process.exit(1)
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.email, email))

  console.log(`✓ Admin created and role assigned: ${email}`)
  console.log('You can now sign in at /login')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
