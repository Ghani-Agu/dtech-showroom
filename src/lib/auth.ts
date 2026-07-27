/**
 * Auth configuration for Dtech Showroom.
 *
 * Required env vars:
 * - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — for Google OAuth (optional in dev;
 *   button renders but the OAuth flow errors until Cloud Console is configured)
 * - ADMIN_EMAILS — comma-separated list of emails auto-promoted to admin on
 *   first sign-in (works for both Google OAuth and email/password sign-ups)
 *   Example: ADMIN_EMAILS=abdelghani.ague@gmail.com,other@example.com
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { users } from '@/db/schema'
import { resend, getFromHeader } from './email'

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

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
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        console.error(
          '[auth] Cannot send reset email — Resend not configured. Reset URL:',
          url
        )
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
              Reset password &rarr;
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },

  // An employee created with email+password can also sign in with
  // "Continuer avec Google" using the same Gmail — the accounts link.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const adminEmails = getAdminEmails()
          const userEmail = (user.email ?? '').toLowerCase()

          if (adminEmails.includes(userEmail)) {
            await db
              .update(users)
              .set({ role: 'admin' })
              .where(eq(users.id, user.id))

            console.log(
              `[auth] Auto-promoted ${user.email} to admin (whitelisted)`
            )
          }
        },
      },
    },
  },

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],

  secret:
    process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-in-production',

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
})

export type AuthSession = typeof auth.$Infer.Session
