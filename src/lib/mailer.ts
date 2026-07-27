/**
 * mailer.ts — thin wrapper around the existing Resend client (src/lib/email.ts).
 *
 * Why this layer exists:
 *   - Centralises the dev/stub fallback so any caller (newsletter, future
 *     transactional, etc.) gets the same behaviour when `RESEND_API_KEY`
 *     isn't set.
 *   - Returns a uniform `{ ok, id, error }` shape so the callers don't have
 *     to know how Resend's response looks.
 *   - In dev/no-key mode, writes the rendered HTML to `/tmp/dtech-dev-mail/`
 *     so you can open it in a browser and visually inspect what your
 *     customers would receive — no network needed.
 *
 * Required env vars (for real sending):
 *   - RESEND_API_KEY          (existing)
 *   - RESEND_FROM_EMAIL       (existing — default: noreply@d-techalgerie.com)
 *   - RESEND_FROM_NAME        (existing — default: Dtech Algérie)
 *   - NEXT_PUBLIC_SITE_URL    (used by callers for absolute links)
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resend, getFromHeader, FROM } from './email'
import { getBrevoApiKey, sendViaBrevo } from './brevo'
import { getAppSetting, SETTING_KEYS } from './app-settings'

export interface SendInput {
  to: string
  subject: string
  html: string
  text?: string
  /** Optional reply-to (e.g. contact@dtech.dz for campaigns). */
  replyTo?: string
  /** Lets us pass standard email headers like List-Unsubscribe — Resend
   *  forwards them verbatim. Used for one-click unsubscribe support. */
  headers?: Record<string, string>
  /** Free-form tag used in dev logs to make grep easy. */
  tag?: string
}

export interface SendResult {
  ok: boolean
  /** Resend message id, when available. */
  id?: string
  /** Filesystem path of the stub copy, when dev/no-key. */
  stubPath?: string
  error?: string
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await getBrevoApiKey()) !== null || resend !== null
}

/** Sender identity: admin-configured (Réglages → Intégrations) with the
 *  existing env vars as fallback. */
async function getFrom(): Promise<{ email: string; name: string }> {
  const [email, name] = await Promise.all([
    getAppSetting(SETTING_KEYS.mailFromEmail),
    getAppSetting(SETTING_KEYS.mailFromName),
  ])
  return {
    email: (email ?? '').trim() || FROM.email,
    name: (name ?? '').trim() || FROM.name,
  }
}

/**
 * Send a single email.
 * Provider order: Brevo (key pasted in admin or BREVO_API_KEY env) →
 * Resend (RESEND_API_KEY env) → dev stub (logged + written to
 * .next/dev-mail so the HTML can be previewed without any key).
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  const { to, subject, html, text, replyTo, headers, tag = 'mail' } = input

  // ── Brevo first — the key the admin pasted in Réglages ───────────────
  const brevoKey = await getBrevoApiKey()
  if (brevoKey) {
    const from = await getFrom()
    const res = await sendViaBrevo({
      to,
      subject,
      html,
      text,
      replyTo,
      headers,
      fromEmail: from.email,
      fromName: from.name,
    })
    if (res.ok) return { ok: true, id: res.id }
    // A hard Brevo failure falls through to Resend when available so a
    // revoked key doesn't silently kill password resets.
    if (!resend) return { ok: false, error: res.error }
    console.warn(`[mailer] Brevo failed (${res.error}) — falling back to Resend`)
  }

  // ── dev / no-key fallback ────────────────────────────────────────────
  if (!resend) {
    return writeDevStub({ to, subject, html, text, tag, headers })
  }

  try {
    // resend.emails.send returns { data, error }
    const from = await getFrom()
    const res = await resend.emails.send({
      from: `${from.name} <${from.email}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(headers ? { headers } : {}),
    } as Parameters<typeof resend.emails.send>[0])

    // The Resend SDK shape varies slightly across versions; defensively read.
    const anyRes = res as unknown as { data?: { id?: string }; error?: { message?: string } }
    if (anyRes.error) {
      return { ok: false, error: anyRes.error.message ?? 'Resend error' }
    }
    return { ok: true, id: anyRes.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Send the same campaign to multiple recipients with light per-batch
 * throttling. Returns one result per recipient. Errors don't stop the
 * loop — they are recorded in `error` so the caller can mark the bad
 * row(s) in `campaign_sends`.
 */
export async function sendBatch(
  recipients: Array<{ to: string; html: string; text?: string }>,
  base: Omit<SendInput, 'to' | 'html' | 'text'>,
  options: { batchSize?: number; gapMs?: number } = {}
): Promise<SendResult[]> {
  const batchSize = options.batchSize ?? 10
  const gapMs = options.gapMs ?? 250
  const results: SendResult[] = []
  for (let i = 0; i < recipients.length; i += batchSize) {
    const slice = recipients.slice(i, i + batchSize)
    const batch = await Promise.all(
      slice.map((r) =>
        sendEmail({
          ...base,
          to: r.to,
          html: r.html,
          text: r.text,
        })
      )
    )
    results.push(...batch)
    if (i + batchSize < recipients.length && gapMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, gapMs))
    }
  }
  return results
}

// ── dev stub: write HTML to a temp directory so it can be opened ──────
async function writeDevStub(opts: {
  to: string
  subject: string
  html: string
  text?: string
  tag: string
  headers?: Record<string, string>
}): Promise<SendResult> {
  try {
    const dir = path.join(process.cwd(), '.next', 'dev-mail')
    await fs.mkdir(dir, { recursive: true })
    const safeTag = opts.tag.replace(/[^a-z0-9_-]/gi, '-')
    const safeTo = opts.to.replace(/[^a-z0-9_-]/gi, '-')
    const file = path.join(
      dir,
      `${Date.now()}-${safeTag}-${safeTo}.html`
    )
    const html =
      `<!-- to:${opts.to}  subject:${opts.subject}  from:${getFromHeader()} -->\n` +
      (opts.headers
        ? Object.entries(opts.headers)
            .map(([k, v]) => `<!-- header:${k}: ${v} -->`)
            .join('\n') + '\n'
        : '') +
      opts.html
    await fs.writeFile(file, html, 'utf8')
    console.info(
      `[mailer:dev-stub] (${opts.tag}) → ${opts.to}\n  subject: ${opts.subject}\n  file: ${file}`
    )
    return { ok: true, stubPath: file }
  } catch (err) {
    // Even the stub failed (e.g. read-only FS) — log and pretend success
    // so the caller's flow isn't blocked in dev.
    console.warn(
      `[mailer:dev-stub] failed to write stub for ${opts.to}: `,
      err
    )
    return { ok: true }
  }
}

/** Convenience re-export for callers that need the "From" line themselves. */
export { getFromHeader, FROM }
