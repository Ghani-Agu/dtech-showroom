import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './client'
import { KEEP_ALIVE_DDL } from '@/server/keep-alive'
import photoCarouselMap from './photo-carousel-map.json'
import productSpecsMap from './product-specs.json'
import catalogueAr from './catalogue-ar.json'

/**
 * Idempotent schema bootstrap — runs once per server start (see
 * src/instrumentation.ts) so the app heals itself even if `pnpm db:push`
 * was never run.
 *
 * WHY IT IS GATED (2026-07-27). On Vercel `register()` fires on EVERY cold
 * start, and this function used to replay ~30 DDL statements plus three
 * `UPDATE … FROM jsonb_each()` backfills that shipped ~300 KB of JSON and
 * scanned the whole products table. Every one of those held a pooled
 * Postgres connection, on a Supabase plan that allows very few — that is a
 * large part of why "opening any page" could exhaust the pool and take the
 * whole site (and the login) down.
 *
 * Now the steady state costs ONE cheap SELECT:
 *   - DDL runs only when its own SHA changes. The marker is a hash of the
 *     statements themselves, so editing/adding DDL below re-runs it
 *     automatically — nothing to remember, no version to bump.
 *   - Each data backfill runs once per dataset version (see BACKFILLS).
 * Escape hatches: DB_FORCE_SCHEMA=1 replays the DDL, DB_FORCE_BACKFILL=1
 * replays the data fills (both still only touch empty rows).
 */

/** Static, parameter-free DDL. Order matters; every statement is IF NOT EXISTS. */
const DDL: string[] = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb`,
  // ── Round 15 — customer role ──
  // New role value + new default: a self-registered visitor becomes a
  // 'customer' (zero admin access — hasAccess() only grants sections to
  // 'staff'). Admin-created accounts set staff/admin explicitly right after
  // creation and ADMIN_EMAILS still auto-promotes on first sign-in.
  // NB: ADD VALUE must run outside an explicit transaction — each execute()
  // here is its own autocommitted statement, so this is safe.
  `ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'customer'`,
  `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'`,
  `CREATE TABLE IF NOT EXISTS "image_blobs" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     "key" text NOT NULL UNIQUE,
     "content_type" text NOT NULL,
     "data" bytea NOT NULL,
     "created_at" timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "image_blobs_key_idx" ON "image_blobs" ("key")`,
  `CREATE TABLE IF NOT EXISTS "site_pages" (
     "key" text PRIMARY KEY,
     "draft" jsonb,
     "published" jsonb,
     "updated_at" timestamptz NOT NULL DEFAULT now(),
     "published_at" timestamptz
   )`,
  // ── Newsletter ── (subscribers / campaigns / campaign_sends)
  `DO $$ BEGIN
     CREATE TYPE "subscriber_status" AS ENUM ('pending','subscribed','unsubscribed','bounced');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "campaign_status" AS ENUM ('draft','scheduled','sending','sent','failed');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "subscribers" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     "email" text NOT NULL UNIQUE,
     "locale" text NOT NULL DEFAULT 'fr',
     "status" subscriber_status NOT NULL DEFAULT 'pending',
     "confirm_token" text,
     "unsubscribe_token" text NOT NULL,
     "source" text,
     "ip_hash" text,
     "created_at" timestamptz NOT NULL DEFAULT now(),
     "confirmed_at" timestamptz,
     "unsubscribed_at" timestamptz
   )`,
  `CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers" ("status")`,
  `CREATE INDEX IF NOT EXISTS "subscribers_created_at_idx" ON "subscribers" ("created_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "subscribers_unsubscribe_token_idx" ON "subscribers" ("unsubscribe_token")`,
  `CREATE TABLE IF NOT EXISTS "campaigns" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     "subject" text NOT NULL,
     "preheader" text,
     "body_html" text NOT NULL DEFAULT '',
     "body_text" text NOT NULL DEFAULT '',
     "audience" text NOT NULL DEFAULT 'all',
     "status" campaign_status NOT NULL DEFAULT 'draft',
     "scheduled_for" timestamptz,
     "sent_at" timestamptz,
     "sent_count" integer NOT NULL DEFAULT 0,
     "open_count" integer NOT NULL DEFAULT 0,
     "click_count" integer NOT NULL DEFAULT 0,
     "created_by" uuid,
     "created_at" timestamptz NOT NULL DEFAULT now(),
     "updated_at" timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" ("status")`,
  `CREATE INDEX IF NOT EXISTS "campaigns_created_at_idx" ON "campaigns" ("created_at" DESC)`,
  `CREATE TABLE IF NOT EXISTS "campaign_sends" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
     "subscriber_id" uuid NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
     "sent_at" timestamptz NOT NULL DEFAULT now(),
     "opened_at" timestamptz,
     "clicked_at" timestamptz,
     "unsubscribed_at" timestamptz,
     "error" text
   )`,
  `CREATE INDEX IF NOT EXISTS "campaign_sends_campaign_id_idx" ON "campaign_sends" ("campaign_id")`,
  `CREATE INDEX IF NOT EXISTS "campaign_sends_subscriber_id_idx" ON "campaign_sends" ("subscriber_id")`,
  // ── Round 11 — email marketing fixes ──
  // created_by was uuid but better-auth ids are TEXT → every campaign INSERT
  // with a creator failed. Convert in place (values, if any, cast).
  `DO $$ BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'campaigns' AND column_name = 'created_by'
         AND data_type = 'uuid'
     ) THEN
       ALTER TABLE "campaigns" ALTER COLUMN "created_by" TYPE text USING "created_by"::text;
     END IF;
   END $$;`,
  // Composer block state (email-blocks.ts).
  `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "body_blocks" jsonb`,
  // Resumable sending needs exactly one row per campaign × subscriber.
  // Dedupe legacy duplicates (keep one arbitrary row), then enforce.
  `DELETE FROM "campaign_sends" a USING "campaign_sends" b
     WHERE a."campaign_id" = b."campaign_id"
       AND a."subscriber_id" = b."subscriber_id"
       AND a.ctid < b.ctid`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "campaign_sends_campaign_subscriber_uq"
     ON "campaign_sends" ("campaign_id", "subscriber_id")`,
  // ── Round 8 — free-form HTML block on the product page ──
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "custom_html" text`,
  // ── Arabic catalogue (Phase 8) — additive AR columns ──
  `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "name_ar" text`,
  `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description_ar" text`,
  `ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "statement_ar" text`,
  `ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "description_ar" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tagline_ar" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description_ar" text`,
  // ── Round 19 — general contact requests ──
  // /contact posts a request that is not about a specific product, so the
  // product FK has to become optional. The three denormalised product_*
  // text columns deliberately stay NOT NULL and carry the request's subject
  // instead, so every existing admin list/detail query keeps working
  // untouched and an inquiry row always renders something meaningful.
  `ALTER TABLE "inquiries" ALTER COLUMN "product_id" DROP NOT NULL`,
  // ── Supabase keep-alive ── (single-row counter bumped by the daily cron —
  // src/server/keep-alive.ts owns the statements so the route can heal a
  // database whose table is missing without waiting for a boot.)
  ...KEEP_ALIVE_DDL,
]

const DDL_HASH = createHash('sha1').update(DDL.join('\n;\n')).digest('hex').slice(0, 12)

/** Bump a value when the shipped JSON changes and must be re-applied. */
const BACKFILLS = {
  photo_carousel: 'v1',
  product_specs: 'v1',
  catalogue_ar: 'v1',
} as const

type BackfillKey = keyof typeof BACKFILLS

const MARKER_DDL = 'schema:ddl'

type MarkerRow = { key: string; value: string | null }

/** Returns null when app_settings doesn't exist yet (virgin database). */
async function readMarkers(): Promise<Map<string, string> | null> {
  try {
    const rows = (await db.execute(
      sql`SELECT "key", "value" FROM "app_settings"
          WHERE "key" = ${MARKER_DDL} OR "key" LIKE 'backfill:%'`
    )) as unknown as MarkerRow[]
    return new Map(rows.map((r): [string, string] => [r.key, r.value ?? '']))
  } catch {
    return null
  }
}

async function setMarker(key: string, value: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO "app_settings" ("key", "value", "updated_at")
    VALUES (${key}, ${value}, now())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value", "updated_at" = now()
  `)
}

export async function ensureSchema(): Promise<void> {
  try {
    const markers = await readMarkers()

    if (markers === null) {
      // Virgin database (or app_settings dropped) — create it first.
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "app_settings" (
          "key" text PRIMARY KEY,
          "value" text,
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )
      `)
    }

    const ddlCurrent =
      markers?.get(MARKER_DDL) === DDL_HASH && process.env.DB_FORCE_SCHEMA !== '1'

    const pendingBackfills = (Object.keys(BACKFILLS) as BackfillKey[]).filter(
      (k) =>
        process.env.DB_FORCE_BACKFILL === '1' ||
        markers?.get(`backfill:${k}`) !== BACKFILLS[k]
    )

    if (ddlCurrent && pendingBackfills.length === 0) {
      // Steady state: one SELECT and we're done. This is the path every
      // Vercel cold start takes.
      return
    }

    if (!ddlCurrent) {
      for (const statement of DDL) {
        await db.execute(sql.raw(statement))
      }
      await setMarker(MARKER_DDL, DDL_HASH)
    }

    // One-shot data fill: real product photo galleries (only rows whose
    // carousel is still empty — never overwrites manual changes).
    if (pendingBackfills.includes('photo_carousel')) {
      await db.execute(sql`
        UPDATE "products" AS p
        SET "photo_carousel_paths" = j.value
        FROM jsonb_each(${JSON.stringify(photoCarouselMap)}::jsonb) AS j(key, value)
        WHERE p."slug" = j.key
          AND p."photo_carousel_paths" = '[]'::jsonb
      `)
      await setMarker('backfill:photo_carousel', BACKFILLS.photo_carousel)
    }

    // One-shot data fill: derived fiche technique (only rows whose specs are
    // still empty — never overwrites manual edits).
    if (pendingBackfills.includes('product_specs')) {
      await db.execute(sql`
        UPDATE "products" AS p
        SET "specs" = j.value
        FROM jsonb_each(${JSON.stringify(productSpecsMap)}::jsonb) AS j(key, value)
        WHERE p."slug" = j.key
          AND p."specs" = '{}'::jsonb
      `)
      await setMarker('backfill:product_specs', BACKFILLS.product_specs)
    }

    // One-shot fill: only rows whose AR is still null — never overwrites
    // manual edits.
    if (pendingBackfills.includes('catalogue_ar')) {
      await db.execute(sql`
        UPDATE "categories" AS c
        SET "name_ar" = j.value->>'nameAr', "description_ar" = j.value->>'descriptionAr'
        FROM jsonb_each(${JSON.stringify(catalogueAr.categories)}::jsonb) AS j(key, value)
        WHERE c."slug" = j.key AND c."name_ar" IS NULL
      `)
      await db.execute(sql`
        UPDATE "brands" AS b
        SET "statement_ar" = j.value->>'statementAr', "description_ar" = j.value->>'descriptionAr'
        FROM jsonb_each(${JSON.stringify(catalogueAr.brands)}::jsonb) AS j(key, value)
        WHERE b."slug" = j.key AND b."statement_ar" IS NULL
      `)
      await db.execute(sql`
        UPDATE "products" AS p
        SET "tagline_ar" = j.value->>'taglineAr', "description_ar" = j.value->>'descriptionAr'
        FROM jsonb_each(${JSON.stringify(catalogueAr.products)}::jsonb) AS j(key, value)
        WHERE p."slug" = j.key AND p."tagline_ar" IS NULL
      `)
      await setMarker('backfill:catalogue_ar', BACKFILLS.catalogue_ar)
    }

    console.log(
      `[db] Schéma appliqué (ddl ${DDL_HASH}${
        pendingBackfills.length ? `, backfills: ${pendingBackfills.join(', ')}` : ''
      }) — les prochains démarrages ne feront plus qu'une seule requête.`
    )
  } catch (err) {
    console.error('[db] ensure-schema failed (will retry next boot):', err)
  }
}
