'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { requireAdmin, getSessionUser } from '@/lib/auth-helpers'
import {
  getAppSetting,
  setAppSetting,
  SETTING_KEYS,
} from '@/lib/app-settings'
import { getBrevoAccount, getBrevoApiKey } from '@/lib/brevo'

const nameSchema = z.string().trim().min(2).max(100)
const passwordSchema = z.string().min(8).max(200)

interface ActionResult {
  ok: boolean
  error?: string
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    return { ok: false, error: 'Not signed in' }
  }

  const parsed = nameSchema.safeParse(formData.get('name'))
  if (!parsed.success) {
    return { ok: false, error: 'Name must be 2 to 100 characters' }
  }

  await db
    .update(users)
    .set({ name: parsed.data, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true }
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    return { ok: false, error: 'Not signed in' }
  }

  const currentRaw = formData.get('currentPassword')
  const newRaw = formData.get('newPassword')

  const currentParsed = z.string().min(1).safeParse(currentRaw)
  const newParsed = passwordSchema.safeParse(newRaw)

  if (!currentParsed.success) {
    return { ok: false, error: 'Current password is required' }
  }
  if (!newParsed.success) {
    return { ok: false, error: 'New password must be at least 8 characters' }
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: currentParsed.data,
        newPassword: newParsed.data,
      },
    })
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to change password'
    return { ok: false, error: message }
  }
}

/* ─────────────────────────────────────────────────────────────────
 * Intégrations — Brevo (email marketing)
 * ─────────────────────────────────────────────────────────────── */

export interface BrevoSettingsView {
  /** Key exists (db or env) */
  configured: boolean
  /** e.g. "xkeysib-…f3a2" — never the full key */
  keyMasked: string | null
  listId: string
  fromEmail: string
  fromName: string
}

function maskKey(key: string): string {
  if (key.length <= 10) return '••••••••'
  return `${key.slice(0, 8)}…${key.slice(-4)}`
}

/** Data for the Réglages → Intégrations tab (admins only; staff get null). */
export async function getBrevoSettingsView(): Promise<BrevoSettingsView | null> {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return null

  const [key, listId, fromEmail, fromName] = await Promise.all([
    getBrevoApiKey(),
    getAppSetting(SETTING_KEYS.brevoListId),
    getAppSetting(SETTING_KEYS.mailFromEmail),
    getAppSetting(SETTING_KEYS.mailFromName),
  ])

  return {
    configured: key !== null,
    keyMasked: key ? maskKey(key) : null,
    listId: listId ?? '',
    fromEmail: fromEmail ?? '',
    fromName: fromName ?? '',
  }
}

const brevoSettingsSchema = z.object({
  /** Empty string = keep the currently stored key. */
  apiKey: z.string().trim().max(200).optional().default(''),
  listId: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Identifiant de liste invalide (nombre attendu)')
    .max(12)
    .optional()
    .default(''),
  fromEmail: z
    .string()
    .trim()
    .email('Adresse e-mail invalide')
    .max(200)
    .or(z.literal(''))
    .optional()
    .default(''),
  fromName: z.string().trim().max(120).optional().default(''),
})

export async function saveBrevoSettings(input: {
  apiKey?: string
  listId?: string
  fromEmail?: string
  fromName?: string
}): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Réservé aux administrateurs' }
  }

  const parsed = brevoSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? 'Paramètres invalides',
    }
  }

  const { apiKey, listId, fromEmail, fromName } = parsed.data

  if (apiKey) {
    await setAppSetting(SETTING_KEYS.brevoApiKey, apiKey)
  }
  await setAppSetting(SETTING_KEYS.brevoListId, listId || null)
  await setAppSetting(SETTING_KEYS.mailFromEmail, fromEmail || null)
  await setAppSetting(SETTING_KEYS.mailFromName, fromName || null)

  revalidatePath('/admin/settings')
  return { ok: true }
}

/** Clears the stored key (env fallback, if set, then applies again). */
export async function clearBrevoKey(): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Réservé aux administrateurs' }
  }
  await setAppSetting(SETTING_KEYS.brevoApiKey, null)
  revalidatePath('/admin/settings')
  return { ok: true }
}

export interface BrevoTestResult {
  ok: boolean
  message: string
}

/**
 * "Tester la connexion" — GET /v3/account with the pasted key (if provided)
 * or the stored/env key. Returns the account email + plan on success.
 */
export async function testBrevoConnection(
  candidateKey?: string
): Promise<BrevoTestResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, message: 'Réservé aux administrateurs' }
  }

  const key = (candidateKey ?? '').trim() || undefined
  const res = await getBrevoAccount(key)

  if (!res.ok) {
    if (res.status === 401) {
      return { ok: false, message: 'Clé API refusée par Brevo (401). Vérifiez la clé.' }
    }
    return { ok: false, message: res.error ?? 'Connexion Brevo impossible' }
  }

  const email = res.data?.email ?? 'compte inconnu'
  const planType = res.data?.plan?.[0]?.type
  return {
    ok: true,
    message: planType
      ? `Connecté : ${email} (plan ${planType})`
      : `Connecté : ${email}`,
  }
}
