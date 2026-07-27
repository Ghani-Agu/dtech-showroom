import 'server-only'
import { getAppSettings, SETTING_KEYS } from './app-settings'

/**
 * The public-facing integration config, resolved once per request and handed
 * to the storefront layout. Two rules baked in:
 *
 *  - admin-pasted values win over env vars, so a key change needs no redeploy
 *    (the env fallbacks exist so a fresh deploy can be pre-configured);
 *  - an integration is only "on" when it has everything it needs, so a
 *    half-filled form can never emit a broken script tag or a dead chat
 *    bubble to real visitors.
 */

export interface SiteIntegrations {
  ga: { enabled: boolean; measurementId: string | null }
  aiChat: {
    enabled: boolean
    baseUrl: string | null
    widgetKey: string | null
    title: string | null
  }
}

/** GA4 ids look like `G-XXXXXXXXXX`. Reject anything else rather than emit it. */
export const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/i

/** messaging-ai widget public keys: `wgt_pk_` + 32 lowercase alphanumerics. */
export const WIDGET_KEY_RE = /^wgt_pk_[a-z0-9]{32}$/

export function normalizeBaseUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().replace(/\/+$/, '')
  if (!v) return null
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    // Keep origin + any path prefix, drop query/hash.
    return `${u.origin}${u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}

export async function getSiteIntegrations(): Promise<SiteIntegrations> {
  const s = await getAppSettings([
    SETTING_KEYS.gaMeasurementId,
    SETTING_KEYS.gaEnabled,
    SETTING_KEYS.aiChatEnabled,
    SETTING_KEYS.aiChatBaseUrl,
    SETTING_KEYS.aiChatWidgetKey,
    SETTING_KEYS.aiChatTitle,
  ])

  const gaId = (
    s[SETTING_KEYS.gaMeasurementId] ??
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
    ''
  ).trim()
  const gaValid = GA_ID_RE.test(gaId)
  // Absent flag = on, so pasting an id is enough to start tracking.
  const gaFlag = s[SETTING_KEYS.gaEnabled] !== '0'

  const baseUrl = normalizeBaseUrl(
    s[SETTING_KEYS.aiChatBaseUrl] ?? process.env.NEXT_PUBLIC_AI_CHAT_BASE_URL
  )
  const widgetKey = (
    s[SETTING_KEYS.aiChatWidgetKey] ??
    process.env.NEXT_PUBLIC_AI_CHAT_WIDGET_KEY ??
    ''
  ).trim()
  const chatFlag = s[SETTING_KEYS.aiChatEnabled] !== '0'

  return {
    ga: {
      enabled: gaValid && gaFlag,
      measurementId: gaValid ? gaId.toUpperCase() : null,
    },
    aiChat: {
      // Needs BOTH an origin and a valid key — otherwise the bubble would
      // open onto a request that can only fail.
      enabled:
        chatFlag && Boolean(baseUrl) && WIDGET_KEY_RE.test(widgetKey),
      baseUrl,
      widgetKey: WIDGET_KEY_RE.test(widgetKey) ? widgetKey : null,
      title: (s[SETTING_KEYS.aiChatTitle] ?? '').trim() || null,
    },
  }
}
