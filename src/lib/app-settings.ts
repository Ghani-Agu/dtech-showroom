import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
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
} as const

export async function getAppSetting(key: string): Promise<string | null> {
  return cachedData(
    `appSetting:${key}`,
    async () => {
      try {
        const rows = await db
          .select({ value: appSettings.value })
          .from(appSettings)
          .where(eq(appSettings.key, key))
          .limit(1)
        return rows[0]?.value ?? null
      } catch {
        // Table may not exist yet on first boot — behave as "not set".
        return null
      }
    },
    { cacheEmpty: true, ttlMs: 30_000 }
  )
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
  bustDataCache('appSetting:')
}
