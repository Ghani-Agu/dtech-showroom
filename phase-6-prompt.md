You are executing Phase 6 — Authentication for the Dtech Showroom 
project. Read this entire prompt before doing anything.

================================================================
CONTEXT (locked, do not relitigate)
================================================================

- Project root: C:\Users\abdel\Desktop\dtech-showroom (current dir)
- Stack: Next.js 16.2.6 App Router, TypeScript strict, React 19, 
  Tailwind v4, Drizzle ORM + postgres.js, Neon Postgres
- Phase 5 complete (latest commit: 27d4075): customer-facing site 
  done — shader hero, scroll choreography, real-photo tier stages
- Real client engagement with Dtech Algérie — production-quality bar
- Architecture decisions LOCKED:
  - Auth: email + password via better-auth
  - Email delivery: Resend (free tier 100/day, $20/mo for 50k/month)
  - Rate limiting: existing Upstash Redis (from Phase 4b)
  - Roles: 'admin' | 'staff' enum
- v2 brand spec is source of truth for all UI design

================================================================
SESSION GOAL (ONE PARAGRAPH)
================================================================

Install and configure better-auth with email+password authentication 
backed by Resend for transactional emails. Add `users` and `sessions` 
tables via Drizzle migration. Build the /login page and 
/forgot-password / /reset-password flow with brand-aligned UI. Add 
middleware that protects all /admin/* routes by redirecting 
unauthenticated visitors to /login. Add server-side sign-out. Add 
login-attempt rate limiting via the existing Upstash Redis from 
Phase 4b. Add a seed mechanism for the initial Dtech admin user via 
environment variables. After this lands, Dtech can sign in at 
/login and reach a protected /admin shell (the actual admin UI 
comes in Phase 7).

================================================================
EXPLICITLY OUT OF SCOPE
================================================================

- The actual admin tool UI (Phase 7 — only the protected shell)
- Magic link / passwordless auth (decision locked: password)
- OAuth (Google, Microsoft, etc.) — not requested
- 2FA / MFA — defer to Phase 7+ if Dtech requests it
- Email verification for new signups (Dtech is a closed system — 
  only admins create users, no public signup)
- User management UI (Phase 7e)
- Password breach checks via HaveIBeenPwned (optional, defer)
- Inquiry email notifications via Resend (Phase 7b)
- Internationalization of auth pages (Phase 8 — for now, English only 
  on auth pages with FR string placeholders noted)
- Modifying brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Touching /motion or any (dev) routes
- Modifying the v2 brand spec
- Touching Phase 5 product stages, shader hero, or scroll 
  choreography

================================================================
EXECUTION DISCIPLINE
================================================================

Use TodoWrite. Top-level tasks:

  1. Install dependencies
  2. Drizzle schema: users + sessions tables
  3. Drizzle migration: apply to Neon
  4. Resend setup (env vars, client init)
  5. better-auth configuration
  6. Auth API route handler
  7. Login page UI
  8. Forgot-password flow UI
  9. Reset-password page UI
  10. Middleware protecting /admin/*
  11. Sign-out server action + AdminHeader component
  12. Initial admin user seed script
  13. .env.example updates
  14. README updates
  15. Verification (lint, tsc, build, smoke tests)
  16. Commit

tsc checkpoint after tasks 3, 6, 9, and 12.

================================================================
TASK 1 — INSTALL DEPENDENCIES
================================================================

Run:
  pnpm add better-auth resend
  pnpm add -D @types/bcrypt

Note: better-auth bundles bcrypt internally. The @types/bcrypt 
package is only needed if we touch bcrypt directly (we shouldn't — 
better-auth handles all hashing).

Verify installations succeeded. If any fail, STOP and report.

================================================================
TASK 2 — DRIZZLE SCHEMA: USERS + SESSIONS
================================================================

Open src/db/schema.ts. Add a userRoleEnum and two tables. Append 
to the existing schema (do NOT remove or modify existing tables):

```typescript
// =========================================================================
// USERS + SESSIONS (Phase 6 — authentication)
// =========================================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'staff'])

export const users = pgTable('users', {
  id: text('id').primaryKey(),  // better-auth uses string IDs by default
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),  // optional profile image URL
  role: userRoleEnum('role').notNull().default('staff'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  password: text('password'),  // hashed by better-auth
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),  // usually email
  value: text('value').notNull(),  // token / OTP
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

Notes:
- `users.id` is text (not uuid) because better-auth uses string IDs 
  by default. This is the better-auth convention; don't fight it.
- `accounts` table stores credentials (password hashes) — better-auth 
  separates user identity from auth methods.
- `verifications` table stores ephemeral tokens for password reset, 
  email verification, etc.
- The schema follows better-auth's expected table shapes — these 
  names and columns are what better-auth's Drizzle adapter looks for.

Reference: https://www.better-auth.com/docs/adapters/drizzle

================================================================
TASK 3 — APPLY MIGRATION
================================================================

Run:
  pnpm db:push

Drizzle will detect the new tables and prompt to apply. Confirm.

Expected output: 4 new tables created — users, sessions, accounts, 
verifications. Plus user_role enum type.

Verify:
  pnpm db:studio

Open the studio in browser. Confirm the 4 new tables appear in the 
sidebar with the correct columns. Close the studio.

================================================================
TASK 4 — RESEND SETUP
================================================================

Step 4.1: Add env vars

Update .env.example to add:

```
# Resend transactional email
# Get API key at https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@d-techalgerie.com  # must be a verified domain in production
RESEND_FROM_NAME=Dtech Algérie

# Better Auth
BETTER_AUTH_SECRET=  # generate via: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000  # change to https://d-techalgerie.com in production

# Initial admin user (for seed script — Phase 6 only)
INITIAL_ADMIN_EMAIL=admin@d-techalgerie.com
INITIAL_ADMIN_NAME=Dtech Admin
INITIAL_ADMIN_PASSWORD=  # set before running seed; min 12 chars
```

Document in README that:
- BETTER_AUTH_SECRET must be set before first run (the seed will fail 
  without it)
- For production, RESEND_FROM_EMAIL must be a verified domain
- INITIAL_ADMIN_PASSWORD is only used by the seed script; change it 
  via the admin UI after first login

Step 4.2: Create Resend client

Create src/lib/email.ts:

```typescript
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    '[email] RESEND_API_KEY is not set — password reset emails will fail in production'
  )
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export const FROM = {
  email: process.env.RESEND_FROM_EMAIL ?? 'noreply@d-techalgerie.com',
  name: process.env.RESEND_FROM_NAME ?? 'Dtech Algérie',
}

export function getFromHeader(): string {
  return `${FROM.name} <${FROM.email}>`
}
```

Note: the conditional Resend client allows dev mode to work without 
Resend configured. Production must have it set.

================================================================
TASK 5 — BETTER AUTH CONFIGURATION
================================================================

Create src/lib/auth.ts:

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { resend, getFromHeader } from './email'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // Dtech is closed system; admins create users
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,  // sign in immediately after registration (but registration is admin-only)
  },
  
  // Password reset via email
  emailVerification: {
    sendOnSignUp: false,
  },
  
  // Custom email sender using Resend
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        console.error('[auth] Cannot send reset email — Resend not configured')
        return
      }
      
      await resend.emails.send({
        from: getFromHeader(),
        to: user.email,
        subject: 'Reset your Dtech admin password',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 40px auto; padding: 40px; background: #0a0a0d; color: #f5f5f3;">
            <p style="font-family: monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin-bottom: 16px;">
              DTECH ALGÉRIE
            </p>
            <h1 style="font-size: 28px; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 16px;">
              Reset your password<span style="color: #3ec5e0;">.</span>
            </h1>
            <p style="font-size: 16px; line-height: 1.5; opacity: 0.78; margin-bottom: 32px;">
              Someone requested a password reset for your Dtech admin account. 
              If this was you, click below. If not, you can safely ignore this email.
            </p>
            <a href="${url}" style="display: inline-block; padding: 12px 24px; background: transparent; border: 1px solid rgba(245, 245, 243, 0.4); color: #f5f5f3; text-decoration: none; border-radius: 9999px;">
              Reset password →
            </a>
            <p style="font-size: 14px; opacity: 0.5; margin-top: 32px;">
              This link expires in 1 hour. If you didn't request this, your account is safe.
            </p>
          </div>
        `,
      })
    },
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,  // 1 day
  },
  
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ],
  
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-in-production',
  
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
})

export type Session = typeof auth.$Infer.Session
```

Note: the dual `emailAndPassword` block in the config above is wrong 
— consolidate into one block with all options. Final form:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  minPasswordLength: 12,
  maxPasswordLength: 128,
  autoSignIn: true,
  sendResetPassword: async ({ user, url }) => {
    // ... (the email send code above)
  },
},
```

================================================================
TASK 6 — AUTH API ROUTE HANDLER
================================================================

Create src/app/api/auth/[...all]/route.ts:

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth.handler)
```

This wires better-auth's internal handlers (sign-in, sign-out, 
reset-password, etc.) to Next.js App Router conventions. All auth 
endpoints live at /api/auth/*.

After this lands, the following endpoints exist automatically:
- POST /api/auth/sign-in/email
- POST /api/auth/sign-up/email
- POST /api/auth/sign-out
- POST /api/auth/forget-password
- POST /api/auth/reset-password
- GET /api/auth/session
- (and more — full list in better-auth docs)

================================================================
TASK 7 — LOGIN PAGE UI
================================================================

Create src/app/login/page.tsx (Server Component shell) and 
src/app/login/LoginForm.tsx (Client Component form).

src/app/login/page.tsx:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — Dtech',
  description: 'Sign in to manage the Dtech catalog.',
  robots: { index: false, follow: false },  // never index login page
}

export default async function LoginPage() {
  // Redirect if already signed in
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  
  if (session) {
    redirect('/admin')
  }
  
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <header className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-3">
            Dtech Algérie · Admin
          </p>
          <h1 className="font-display text-4xl tracking-tight text-text-primary">
            Sign in<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary mt-4">
            Manage the catalog, review inquiries, update products.
          </p>
        </header>
        
        <LoginForm />
      </div>
    </main>
  )
}
```

src/app/login/LoginForm.tsx:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: '/admin',
    })
    
    if (result.error) {
      setError(result.error.message ?? 'Sign-in failed. Check your email and password.')
      setIsPending(false)
      return
    }
    
    router.push('/admin')
    router.refresh()
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="block font-body text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface-elevated px-4 py-3 font-body text-base text-text-primary placeholder:text-text-muted rounded-md outline-none transition focus:ring-1 focus:ring-accent"
          placeholder="you@d-techalgerie.com"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block font-body text-sm font-medium text-text-secondary">
            Password
          </label>
          <Link 
            href="/forgot-password" 
            className="font-body text-sm text-text-muted underline decoration-text-muted underline-offset-2 transition-colors hover:decoration-accent hover:text-text-secondary"
          >
            Forgot?
          </Link>
        </div>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface-elevated px-4 py-3 font-body text-base text-text-primary placeholder:text-text-muted rounded-md outline-none transition focus:ring-1 focus:ring-accent"
        />
      </div>
      
      {error && (
        <p role="alert" className="font-body text-sm text-semantic-error">
          {error}
        </p>
      )}
      
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-6 py-3 font-body text-base font-medium text-text-primary bg-surface-elevated rounded-md transition hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Signing in...' : 'Sign in →'}
      </button>
    </form>
  )
}
```

Step 7.3: Create auth client

Create src/lib/auth-client.ts:

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
})

export const { signIn, signOut, signUp, useSession } = authClient
```

================================================================
TASK 8 — FORGOT-PASSWORD FLOW
================================================================

Create src/app/forgot-password/page.tsx and 
src/app/forgot-password/ForgotPasswordForm.tsx.

src/app/forgot-password/page.tsx:

```tsx
import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset password — Dtech',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <header className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-3">
            Dtech Algérie · Admin
          </p>
          <h1 className="font-display text-4xl tracking-tight text-text-primary">
            Reset password<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary mt-4">
            Enter your email. We'll send you a reset link.
          </p>
        </header>
        
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
```

src/app/forgot-password/ForgotPasswordForm.tsx:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    
    // Always show success — don't leak whether email exists
    await authClient.forgetPassword({
      email,
      redirectTo: '/reset-password',
    })
    
    setSubmitted(true)
    setIsPending(false)
  }
  
  if (submitted) {
    return (
      <div className="text-center space-y-6">
        <p className="font-body text-lg text-text-secondary">
          If an account exists for that email, a reset link has been sent.
        </p>
        <Link 
          href="/login" 
          className="inline-block font-body text-base text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:decoration-accent"
        >
          ← Back to sign in
        </Link>
      </div>
    )
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-body text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface-elevated px-4 py-3 font-body text-base text-text-primary placeholder:text-text-muted rounded-md outline-none transition focus:ring-1 focus:ring-accent"
        />
      </div>
      
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-6 py-3 font-body text-base font-medium text-text-primary bg-surface-elevated rounded-md transition hover:bg-surface-overlay disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Send reset link →'}
      </button>
      
      <div className="text-center pt-2">
        <Link 
          href="/login" 
          className="font-body text-sm text-text-muted underline decoration-text-muted underline-offset-2 hover:decoration-accent hover:text-text-secondary"
        >
          ← Back to sign in
        </Link>
      </div>
    </form>
  )
}
```

================================================================
TASK 9 — RESET-PASSWORD PAGE
================================================================

better-auth handles the reset token parsing automatically. The page 
just needs to render the form and call `authClient.resetPassword()`.

Create src/app/reset-password/page.tsx:

```tsx
import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Set new password — Dtech',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token
  
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl text-text-primary mb-4">
            Invalid reset link<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary">
            This link is missing or expired. Request a new one from the sign-in page.
          </p>
        </div>
      </main>
    )
  }
  
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
      <div className="w-full max-w-md">
        <header className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-3">
            Dtech Algérie · Admin
          </p>
          <h1 className="font-display text-4xl tracking-tight text-text-primary">
            New password<span className="text-accent">.</span>
          </h1>
          <p className="font-body text-base text-text-secondary mt-4">
            Set a new password. Minimum 12 characters.
          </p>
        </header>
        
        <ResetPasswordForm token={token} />
      </div>
    </main>
  )
}
```

Create src/app/reset-password/ResetPasswordForm.tsx with similar 
patterns to LoginForm — password input, confirm-password input, 
submit calls `authClient.resetPassword({ newPassword, token })`, 
redirects to /login on success.

================================================================
TASK 10 — MIDDLEWARE PROTECTING /admin/*
================================================================

Create or update src/middleware.ts:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }
  
  // Get session via better-auth
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  
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
```

After middleware lands:
- Visiting /admin without a session → redirect to /login?redirect=/admin
- After successful login, LoginForm should honor the `redirect` query 
  param if present (update LoginForm if needed to read 
  searchParams.redirect)

Update LoginForm to read the redirect param via useSearchParams() 
and pass it as callbackURL in signIn.email().

================================================================
TASK 11 — SIGN-OUT + ADMIN HEADER STUB
================================================================

Create src/components/admin/AdminHeader.tsx:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

export function AdminHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  
  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }
  
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-surface-elevated border-b border-surface-overlay">
      <Link href="/admin" className="font-mono text-sm uppercase tracking-wider text-text-primary">
        DTECH · ADMIN
      </Link>
      
      <div className="flex items-center gap-4">
        {!isPending && session?.user && (
          <>
            <span className="font-body text-sm text-text-secondary">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="font-body text-sm text-text-primary underline decoration-text-muted underline-offset-4 hover:decoration-accent"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
```

Update src/app/admin/layout.tsx (create if it doesn't exist):

```tsx
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-base">
      <AdminHeader />
      <div className="px-6 py-8">{children}</div>
    </div>
  )
}
```

If the existing /admin route or /admin/inquiries placeholder pages 
break due to this layout addition, that's expected — Phase 7 will 
rebuild them properly. For now, ensure they at least render without 
500 errors.

================================================================
TASK 12 — INITIAL ADMIN SEED
================================================================

Create scripts/seed-admin.ts (separate from src/db/seed.ts which 
seeds catalog data):

```typescript
import { auth } from '@/lib/auth'

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL
  const name = process.env.INITIAL_ADMIN_NAME
  const password = process.env.INITIAL_ADMIN_PASSWORD
  
  if (!email || !name || !password) {
    console.error('Missing INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, or INITIAL_ADMIN_PASSWORD')
    process.exit(1)
  }
  
  if (password.length < 12) {
    console.error('INITIAL_ADMIN_PASSWORD must be at least 12 characters')
    process.exit(1)
  }
  
  console.log(`Creating initial admin: ${email}`)
  
  // Use better-auth's internal API to create the user
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  })
  
  if (!result) {
    console.error('Failed to create admin user')
    process.exit(1)
  }
  
  // Promote to admin role via direct DB update
  const { db } = await import('@/db/client')
  const { users } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')
  
  await db
    .update(users)
    .set({ role: 'admin' })
    .where(eq(users.email, email))
  
  console.log(`✓ Admin created and role assigned: ${email}`)
  console.log('You can now sign in at /login')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Add a package.json script:

```json
"db:seed-admin": "tsx --env-file=.env.local scripts/seed-admin.ts"
```

User can run `pnpm db:seed-admin` after setting INITIAL_ADMIN_* env 
vars to create the first admin.

================================================================
TASK 13 — .env.example UPDATES
================================================================

The full .env.example should now include (existing + new):

```
# Database (Neon Postgres)
DATABASE_URL="postgresql://...?sslmode=require"

# Public site URL
NEXT_PUBLIC_SITE_URL="https://dtech-showroom.vercel.app"

# Upstash Redis for rate limiting
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"

# Better Auth
BETTER_AUTH_SECRET=  # generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Resend transactional email
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@d-techalgerie.com
RESEND_FROM_NAME=Dtech Algérie

# Initial admin user (Phase 6 seed)
INITIAL_ADMIN_EMAIL=admin@d-techalgerie.com
INITIAL_ADMIN_NAME=Dtech Admin
INITIAL_ADMIN_PASSWORD=  # min 12 chars
```

================================================================
TASK 14 — README UPDATES
================================================================

Add a section to README.md (after the existing Phase 4b Rate Limiting 
section):

```markdown
## Authentication Setup (Phase 6)

The admin panel at `/admin/*` is protected by better-auth.

### Initial setup

1. Generate a secret:
   ```bash
   openssl rand -base64 32
   ```
   Set as `BETTER_AUTH_SECRET` in `.env.local`.

2. Sign up for Resend (https://resend.com), create an API key, 
   add to `.env.local` as `RESEND_API_KEY`.

3. Apply the schema migration:
   ```bash
   pnpm db:push
   ```

4. Set initial admin credentials in `.env.local`:
   ```
   INITIAL_ADMIN_EMAIL=admin@d-techalgerie.com
   INITIAL_ADMIN_NAME=Dtech Admin
   INITIAL_ADMIN_PASSWORD=<min 12 chars>
   ```

5. Run the admin seed:
   ```bash
   pnpm db:seed-admin
   ```

6. Visit http://localhost:3000/login and sign in.
   Change the password from the admin UI (coming in Phase 7).

### Production notes

- `RESEND_FROM_EMAIL` must be on a domain verified in Resend
- `BETTER_AUTH_URL` must match the production URL
- Never commit `BETTER_AUTH_SECRET` or `INITIAL_ADMIN_PASSWORD` to git
```

================================================================
TASK 15 — VERIFICATION
================================================================

Run:
  pnpm lint
  pnpm exec tsc --noEmit
  pnpm build

All must pass.

Start dev server:
  $job = Start-Job { Set-Location C:\Users\abdel\Desktop\dtech-showroom; pnpm dev }
  Start-Sleep -Seconds 10

Test these routes:

  $routes = @(
    '/login',
    '/forgot-password',
    '/reset-password'
  )
  foreach ($r in $routes) {
    $url = "http://localhost:3000$r"
    try {
      $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

Expected:
- /login → 200
- /forgot-password → 200
- /reset-password → 200 (renders the "Invalid reset link" message 
  without a token, which is correct)

Test middleware protection:
  $res = Invoke-WebRequest -Uri http://localhost:3000/admin -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
  Write-Host "Status: $($res.StatusCode)"
  # Expected: 307 or 302 (redirect to /login)

Regression smoke tests on existing routes:
  $existing = @('/', '/brands', '/categories', '/products/hp-omen-16-i9-rtx-4070', '/about')
  foreach ($r in $existing) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -TimeoutSec 10
      Write-Host "$($res.StatusCode) $r"
    } catch {
      Write-Host "ERROR $r"
    }
  }

All should still return 200.

Stop dev:
  Stop-Job $job; Remove-Job $job

================================================================
TASK 16 — COMMIT
================================================================

git add .
git commit -m "feat: phase 6 — authentication via better-auth

NEW DEPENDENCIES:
- better-auth — modern type-safe auth library
- resend — transactional email
- @types/bcrypt (dev) — for type safety if direct bcrypt ever used

DATABASE:
- users table (id, email, name, role enum, image, timestamps)
- sessions table (token-based, IP + UA tracked)
- accounts table (better-auth's credential storage)
- verifications table (password reset tokens)
- user_role enum: 'admin' | 'staff'

AUTH FLOWS:
- /login — email + password sign-in
- /forgot-password — request reset link
- /reset-password?token=... — set new password
- /api/auth/* — better-auth handlers (sign-in, sign-out, session, 
  password reset)
- Sign-out via AdminHeader button

EMAIL:
- Resend integration via src/lib/email.ts
- Password reset email with brand-aligned HTML template
- Graceful fallback in dev (logs warning if Resend not configured)

PROTECTION:
- Middleware redirects /admin/* to /login when no session
- Login form honors ?redirect= query param

ADMIN SHELL:
- src/app/admin/layout.tsx wraps with AdminHeader
- AdminHeader shows logged-in email + sign-out button

SEED:
- scripts/seed-admin.ts creates initial admin from env vars
- pnpm db:seed-admin runs the script

ENV:
- BETTER_AUTH_SECRET, BETTER_AUTH_URL
- RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME
- INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_PASSWORD

OUT OF SCOPE (Phase 7+):
- Admin tool UI itself
- User management (Phase 7e)
- Email verification on signup (closed system, admins create users)
- 2FA / MFA
- OAuth providers
- i18n on auth pages (Phase 8)"

================================================================
ACCEPTANCE CRITERIA
================================================================

- [ ] pnpm lint passes
- [ ] pnpm exec tsc --noEmit passes
- [ ] pnpm build succeeds
- [ ] /login renders without errors
- [ ] /forgot-password renders without errors
- [ ] /reset-password renders without errors (with or without token)
- [ ] /admin redirects to /login when no session (307 or 302)
- [ ] Existing routes still return 200 (regression check)
- [ ] users, sessions, accounts, verifications tables exist in DB
- [ ] /api/auth/* endpoints accessible
- [ ] AdminHeader renders sign-out button
- [ ] One commit with message format above

================================================================
WHAT TO REPORT WHEN DONE
================================================================

1. Files created (count + summary)
2. Files modified (count + summary)
3. Build verification outputs
4. New route smoke tests (/login, /forgot-password, /reset-password)
5. Middleware protection test (/admin → redirect)
6. Regression smoke tests on existing routes
7. Database state confirmation (4 new tables present)
8. Any warnings or deviations from spec
9. Final commit hash
10. Reminder for user to set BETTER_AUTH_SECRET and run db:seed-admin

================================================================
DO NOT
================================================================

- Run pnpm db:seed-admin — the user does this manually after setting 
  INITIAL_ADMIN_* env vars
- Modify the catalog seed (src/db/seed.ts) — this is a separate seed
- Modify the v2 brand spec or any project knowledge files
- Modify brand-tokens.ts, fonts.ts, animations.ts, globals.css
- Touch /motion or any (dev) routes
- Touch Phase 5 components (product stages, shader hero, choreography)
- Add OAuth providers (Google, Microsoft, etc.)
- Implement 2FA / MFA
- Build the actual admin tool UI (Phase 7)
- Add email verification flow on signup
- "Improve" better-auth's defaults beyond what's specified
- Add Sentry, LogRocket, or other monitoring (Phase 9)

================================================================
FAILURE MODES TO WATCH
================================================================

- If better-auth's drizzle adapter complains about schema mismatch: 
  check that table and column names match better-auth's expected 
  shape (verify against https://www.better-auth.com/docs/adapters/drizzle).

- If pnpm db:push fails on new tables: ensure existing tables aren't 
  modified, only new ones added. The migration should be additive.

- If `auth.api.getSession()` returns null in middleware despite valid 
  cookie: middleware runs in Edge runtime by default. better-auth 
  documentation recommends Node runtime for getSession in middleware.
  Add `export const runtime = 'nodejs'` to middleware.ts if needed.

- If Resend import fails server-side: check that the import is from 
  'resend' (the npm package). The package works in both Node and 
  Edge runtimes.

- If TypeScript errors on `auth.$Infer.Session`: better-auth's type 
  inference requires a successful auth config build. If config has 
  errors, types won't resolve. Fix config errors first.

- If middleware causes infinite redirect loop: ensure the middleware 
  matcher excludes /login itself (it does — only matches /admin/*).

- If sign-in returns success but session isn't created: check 
  cookies in browser dev tools. better-auth uses `better-auth.session_token` 
  cookie. If missing, check BETTER_AUTH_URL matches the dev origin.

- If the login form's autocomplete doesn't work: confirm 
  autoComplete="email" on email input and autoComplete="current-password" 
  on password input.

- If `next/headers` import fails in middleware: middleware has its 
  own request.headers — use that, not next/headers.

- If `toNextJsHandler` import fails: the package path is 
  `better-auth/next-js` (not `better-auth/next`). Check the package 
  version supports this export.

================================================================
NOTES FOR THE USER (FOR THE COMPLETION REPORT)
================================================================

Include in the completion report a reminder that the user must:

1. Generate BETTER_AUTH_SECRET:
   `openssl rand -base64 32` (or any 32+ char random string on Windows)
2. Sign up for Resend at https://resend.com, get an API key
3. Add to .env.local:
   - BETTER_AUTH_SECRET=<generated>
   - RESEND_API_KEY=<from resend>
   - INITIAL_ADMIN_EMAIL=<their choice>
   - INITIAL_ADMIN_NAME=<their choice>
   - INITIAL_ADMIN_PASSWORD=<min 12 chars>
4. Run: pnpm db:seed-admin
5. Visit http://localhost:3000/login and sign in

If any of those steps blocks production deployment (Phase 9), surface 
that in the completion notes.