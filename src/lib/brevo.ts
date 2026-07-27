import 'server-only'
import { getAppSetting, SETTING_KEYS } from './app-settings'

/**
 * brevo.ts — minimal Brevo (ex-Sendinblue) REST client. No SDK dependency:
 * the three endpoints we use are plain JSON over HTTPS.
 *
 * The API key is pasted by the admin in Réglages → Intégrations (stored in
 * app_settings), with the BREVO_API_KEY env var as a fallback. When a key
 * is configured, ALL outgoing email (campaigns, newsletter confirmations,
 * password resets) goes through Brevo — see lib/mailer.ts — and confirmed
 * newsletter subscribers are upserted as Brevo contacts.
 */

/** Real endpoint in production; BREVO_API_BASE exists so tests/debugging can
 *  point the client at a mock server (e.g. http://127.0.0.1:4545/v3). */
const BREVO_API =
  (process.env.BREVO_API_BASE ?? '').trim().replace(/\/+$/, '') ||
  'https://api.brevo.com/v3'

export async function getBrevoApiKey(): Promise<string | null> {
  const fromDb = await getAppSetting(SETTING_KEYS.brevoApiKey)
  const key = (fromDb ?? process.env.BREVO_API_KEY ?? '').trim()
  return key.length > 0 ? key : null
}

export async function isBrevoConfigured(): Promise<boolean> {
  return (await getBrevoApiKey()) !== null
}

interface BrevoRequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  /** Pass an explicit key (e.g. to test a just-pasted one before saving). */
  apiKey?: string
}

export interface BrevoResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

async function brevoFetch<T = unknown>(
  path: string,
  options: BrevoRequestOptions = {}
): Promise<BrevoResult<T>> {
  const key = options.apiKey ?? (await getBrevoApiKey())
  if (!key) {
    return { ok: false, status: 0, error: 'Aucune clé API Brevo configurée' }
  }

  try {
    const res = await fetch(`${BREVO_API}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'api-key': key,
        accept: 'application/json',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      cache: 'no-store',
    })

    const text = await res.text()
    let data: unknown = undefined
    try {
      data = text ? JSON.parse(text) : undefined
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const message =
        (data as { message?: string } | undefined)?.message ??
        `Brevo HTTP ${res.status}`
      return { ok: false, status: res.status, data: data as T, error: message }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Erreur réseau Brevo',
    }
  }
}

export interface BrevoAccountInfo {
  email?: string
  companyName?: string
  plan?: Array<{ type?: string; credits?: number }>
}

/** GET /account — used by the "Tester la connexion" button. */
export async function getBrevoAccount(
  apiKey?: string
): Promise<BrevoResult<BrevoAccountInfo>> {
  return brevoFetch<BrevoAccountInfo>('/account', { apiKey })
}

export interface BrevoSendInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
  fromEmail: string
  fromName: string
}

/** POST /smtp/email — transactional send (used for ALL app email). */
export async function sendViaBrevo(
  input: BrevoSendInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await brevoFetch<{ messageId?: string }>('/smtp/email', {
    method: 'POST',
    body: {
      sender: { email: input.fromEmail, name: input.fromName },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text ? { textContent: input.text } : {}),
      ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    },
  })

  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, id: res.data?.messageId }
}

/**
 * POST /contacts (updateEnabled) — mirror a confirmed newsletter subscriber
 * into Brevo so campaigns can also be run from the Brevo dashboard.
 * Fire-and-forget from the caller's perspective; errors are returned but
 * never thrown.
 */
export async function upsertBrevoContact(
  email: string,
  attributes: Record<string, string> = {},
  listId?: number | null
): Promise<{ ok: boolean; error?: string }> {
  const res = await brevoFetch('/contacts', {
    method: 'POST',
    body: {
      email,
      updateEnabled: true,
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      ...(listId ? { listIds: [listId] } : {}),
    },
  })
  // 201 created / 204 updated are both fine.
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true }
}

/**
 * PUT /contacts/{email} — flip the transactional/marketing blacklist flag.
 * Called when someone unsubscribes on OUR site so the Brevo contact base
 * stays coherent (otherwise a campaign run from the Brevo dashboard would
 * still email them). 404 = contact never mirrored — that's fine.
 */
export async function setBrevoContactBlacklist(
  email: string,
  blacklisted: boolean
): Promise<{ ok: boolean; error?: string }> {
  const res = await brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: { emailBlacklisted: blacklisted },
  })
  if (!res.ok && res.status !== 404) return { ok: false, error: res.error }
  return { ok: true }
}

/** The configured Brevo list id (app_settings), or null. */
export async function getBrevoListId(): Promise<number | null> {
  const raw = await getAppSetting(SETTING_KEYS.brevoListId)
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}
