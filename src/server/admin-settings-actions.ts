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
import {
  GA_ID_RE,
  WIDGET_KEY_RE,
  normalizeBaseUrl,
} from '@/lib/site-integrations'

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

/* ------------------------------------------------------------------ */
/* Google Analytics 4                                                  */
/* ------------------------------------------------------------------ */

export interface AnalyticsSettingsView {
  configured: boolean
  measurementId: string
  enabled: boolean
  /** True when the value comes from the env var rather than app_settings. */
  fromEnv: boolean
}

export async function getAnalyticsSettingsView(): Promise<AnalyticsSettingsView | null> {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return null

  const [stored, flag] = await Promise.all([
    getAppSetting(SETTING_KEYS.gaMeasurementId),
    getAppSetting(SETTING_KEYS.gaEnabled),
  ])
  const envId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim()
  const id = (stored ?? envId).trim()

  return {
    configured: GA_ID_RE.test(id),
    measurementId: id,
    enabled: flag !== '0',
    fromEnv: !stored && envId.length > 0,
  }
}

const analyticsSchema = z.object({
  measurementId: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || GA_ID_RE.test(v), {
      message: 'Identifiant GA4 invalide — format attendu : G-XXXXXXXXXX',
    })
    .optional()
    .default(''),
  enabled: z.boolean().optional().default(true),
})

export async function saveAnalyticsSettings(input: {
  measurementId?: string
  enabled?: boolean
}): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Réservé aux administrateurs' }
  }

  const parsed = analyticsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
    }
  }

  const { measurementId, enabled } = parsed.data
  await setAppSetting(
    SETTING_KEYS.gaMeasurementId,
    measurementId ? measurementId.toUpperCase() : null
  )
  await setAppSetting(SETTING_KEYS.gaEnabled, enabled ? null : '0')

  // The tag is injected by the locale layout, so every storefront route has
  // to re-render for the change to take effect.
  revalidatePath('/', 'layout')
  revalidatePath('/admin/settings')
  revalidatePath('/admin/analytics')
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* D-Tech AI customer chat                                             */
/* ------------------------------------------------------------------ */

export interface AiChatSettingsView {
  configured: boolean
  enabled: boolean
  baseUrl: string
  widgetKey: string
  title: string
  /** Set when values are present but wouldn't produce a working widget. */
  problem: string | null
}

export async function getAiChatSettingsView(): Promise<AiChatSettingsView | null> {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return null

  const [flag, baseUrl, widgetKey, title] = await Promise.all([
    getAppSetting(SETTING_KEYS.aiChatEnabled),
    getAppSetting(SETTING_KEYS.aiChatBaseUrl),
    getAppSetting(SETTING_KEYS.aiChatWidgetKey),
    getAppSetting(SETTING_KEYS.aiChatTitle),
  ])

  const url = (baseUrl ?? '').trim()
  const key = (widgetKey ?? '').trim()
  const normalized = normalizeBaseUrl(url)

  let problem: string | null = null
  if (url && !normalized) problem = "L'adresse de l'application IA est invalide."
  else if (key && !WIDGET_KEY_RE.test(key))
    problem = 'La clé publique du widget est invalide (format wgt_pk_…).'
  else if (normalized && !key) problem = 'Il manque la clé publique du widget.'
  else if (key && !normalized) problem = "Il manque l'adresse de l'application IA."

  return {
    configured: Boolean(normalized) && WIDGET_KEY_RE.test(key),
    enabled: flag !== '0',
    baseUrl: url,
    widgetKey: key,
    title: title ?? '',
    problem,
  }
}

const aiChatSchema = z.object({
  enabled: z.boolean().optional().default(true),
  baseUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || normalizeBaseUrl(v) !== null, {
      message:
        'Adresse invalide — attendu une URL complète, ex. https://ia.dtech.dz',
    })
    .optional()
    .default(''),
  widgetKey: z
    .string()
    .trim()
    .max(60)
    .refine((v) => v === '' || WIDGET_KEY_RE.test(v), {
      message:
        'Clé publique invalide — format attendu : wgt_pk_… (32 caractères)',
    })
    .optional()
    .default(''),
  title: z.string().trim().max(60).optional().default(''),
})

export async function saveAiChatSettings(input: {
  enabled?: boolean
  baseUrl?: string
  widgetKey?: string
  title?: string
}): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, error: 'Réservé aux administrateurs' }
  }

  const parsed = aiChatSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
    }
  }

  const { enabled, baseUrl, widgetKey, title } = parsed.data
  await setAppSetting(SETTING_KEYS.aiChatBaseUrl, normalizeBaseUrl(baseUrl))
  await setAppSetting(SETTING_KEYS.aiChatWidgetKey, widgetKey || null)
  await setAppSetting(SETTING_KEYS.aiChatTitle, title || null)
  await setAppSetting(SETTING_KEYS.aiChatEnabled, enabled ? null : '0')

  revalidatePath('/', 'layout')
  revalidatePath('/admin/settings')
  return { ok: true }
}

export interface AiChatTestResult {
  ok: boolean
  message: string
}

/**
 * Reachability probe. What this proves is that the origin answers and that
 * the widget key resolves to a live channel — not that any reply is good.
 *
 * Runs server-side so a CORS rejection can't hide the real status code: from
 * the browser it would surface only as "TypeError: Failed to fetch".
 */
export async function testAiChatConnection(input: {
  baseUrl?: string
  widgetKey?: string
}): Promise<AiChatTestResult> {
  try {
    await requireAdmin()
  } catch {
    return { ok: false, message: 'Réservé aux administrateurs' }
  }

  const base =
    normalizeBaseUrl(input.baseUrl) ??
    normalizeBaseUrl(await getAppSetting(SETTING_KEYS.aiChatBaseUrl))
  const key =
    (input.widgetKey ?? '').trim() ||
    ((await getAppSetting(SETTING_KEYS.aiChatWidgetKey)) ?? '').trim()

  if (!base)
    return { ok: false, message: "Renseignez l'adresse de l'application IA." }
  if (!WIDGET_KEY_RE.test(key))
    return {
      ok: false,
      message: 'Renseignez une clé publique valide (wgt_pk_…).',
    }

  const siteOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'
  ).replace(/\/+$/, '')

  try {
    const res = await fetch(`${base}/api/widget/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: siteOrigin },
      body: JSON.stringify({
        widgetKey: key,
        message: 'ping',
        customerExternalId: 'dtech-showroom-connection-test',
      }),
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    })

    if (res.status === 401) {
      await res.body?.cancel()
      return {
        ok: false,
        message:
          'Clé publique refusée (401) — vérifiez la clé du canal Widget.',
      }
    }
    if (res.status === 403) {
      await res.body?.cancel()
      return {
        ok: false,
        message: `Origine refusée (403) — ajoutez ${siteOrigin} aux origines autorisées du canal Widget.`,
      }
    }
    if (res.status === 503) {
      await res.body?.cancel()
      return {
        ok: false,
        message: 'Le canal Widget est en pause côté application IA.',
      }
    }
    if (res.status === 429) {
      await res.body?.cancel()
      return {
        ok: false,
        message: 'Limite de débit atteinte (429). Réessayez dans un instant.',
      }
    }
    if (!res.ok) {
      await res.body?.cancel()
      return {
        ok: false,
        message: `L'application IA a répondu ${res.status}. Vérifiez qu'elle est déployée et accessible.`,
      }
    }

    // Don't drain the model's reply — we only needed the handshake.
    const acao = res.headers.get('access-control-allow-origin')
    await res.body?.cancel()
    if (acao && acao !== siteOrigin && acao !== '*') {
      return {
        ok: true,
        message: `Connecté, mais l'origine autorisée renvoyée est « ${acao} ». Ajoutez ${siteOrigin} côté application IA.`,
      }
    }
    return { ok: true, message: 'Connecté — le chat IA répond correctement.' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/timeout|abort/i.test(msg))
      return {
        ok: false,
        message: "Délai dépassé — l'application IA n'a pas répondu en 12 s.",
      }
    return {
      ok: false,
      message: `Impossible de joindre l'application IA (${msg}). Est-elle déployée ?`,
    }
  }
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
