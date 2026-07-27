import 'server-only'
import { db } from '@/db/client'
import { withDb } from '@/db/health'
import { appSettings } from '@/db/schema'
import { cachedData, bustDataCache } from './data-cache'

/**
 * app-settings.ts — typed access to the app_settings key/value table
 * (created idempotently in ensure-schema.ts). Used for configuration the
 * admin edits from the UI — e.g. the Brevo API key — so no redeploy or
 * env-var change is needed.
 */

export const SETTING_KEYS = {
  brevoApiKey: 'brevo:api_key',
  brevoListId: 'brevo:list_id',
  mailFromEmail: 'mail:from_email',
  mailFromName: 'mail:from_name',

  /** Google Analytics 4 — pasted in admin, no redeploy needed. */
  gaMeasurementId: 'analytics:ga_id',
  gaEnabled: 'analytics:ga_enabled',

  /** D-Tech AI customer chat (messaging-ai widget API). */
  aiChatEnabled: 'ai:chat_enabled',
  aiChatBaseUrl: 'ai:chat_base_url',
  aiChatWidgetKey: 'ai:chat_widget_key',
  aiChatTitle: 'ai:chat_title',
} as const

/**
 * The whole table in ONE round trip, cached under a single key.
 *
 * app_settings holds a handful of short rows. Reading them key-by-key meant
 * the [locale] layout alone issued six separate queries per render just to
 * decide whether to mount GA and the chat bubble — six chances to stall on a
 * slow link, for a payload measured in bytes. One read covers every key,
 * present or future.
 */
async function getAllAppSettings(): Promise<Record<string, string | null>> {
  return cachedData(
    'appSettings:all',
    async () => {
      try {
        const rows = await withDb(() =>
          db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings)
        )
        return Object.fromEntries(rows.map((r) => [r.key, r.value ?? null]))
      } catch {
        // Table may not exist yet on first boot — behave as "nothing set".
        return {}
      }
    },
    { cacheEmpty: true, ttlMs: 30_000 }
  )
}

/** Read several settings in one pass — a single query behind the cache. */
export async function getAppSettings<K extends string>(
  keys: readonly K[]
): Promise<Record<K, string | null>> {
  const all = await getAllAppSettings()
  return Object.fromEntries(keys.map((k) => [k, all[k] ?? null])) as Record<
    K,
    string | null
  >
}

export async function getAppSetting(key: string): Promise<string | null> {
  const all = await getAllAppSettings()
  return all[key] ?? null
}

export async function setAppSetting(
  key: string,
  value: string | null
): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    })
  bustDataCache('appSettings:')
}
