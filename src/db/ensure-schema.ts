import { sql } from 'drizzle-orm'
import { db } from './client'
import photoCarouselMap from './photo-carousel-map.json'
import productSpecsMap from './product-specs.json'
import catalogueAr from './catalogue-ar.json'

/**
 * Idempotent schema bootstrap — runs once per server start (see
 * src/instrumentation.ts). Adds the bits recent rounds introduced so the
 * app heals itself even if `pnpm db:push` wasn't run:
 *   - users.permissions (per-section admin access)
 *   - image_blobs (DB-hosted product photos)
 * Every statement is IF NOT EXISTS — safe to run on every boot.
 */
export async function ensureSchema(): Promise<void> {
  try {
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb`
    )
    // ── Round 15 — customer accounts (public sign-up on all skins) ──
    // New role value + new default: a self-registered visitor becomes a
    // 'customer' (zero admin access — hasAccess() only grants sections to
    // 'staff'). Admin-created accounts set staff/admin explicitly right
    // after creation and ADMIN_EMAILS still auto-promotes on first sign-in.
    // NB: ADD VALUE must run outside an explicit transaction — each
    // db.execute here is its own autocommitted statement, so this is safe.
    await db.execute(
      sql`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'customer'`
    )
    await db.execute(
      sql`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'`
    )
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "image_blobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" text NOT NULL UNIQUE,
        "content_type" text NOT NULL,
        "data" bytea NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "image_blobs_key_idx" ON "image_blobs" ("key")`
    )
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "site_pages" (
        "key" text PRIMARY KEY,
        "draft" jsonb,
        "published" jsonb,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "published_at" timestamptz
      )
    `)
    // One-shot data fill: real product photo galleries (only rows whose
    // carousel is still empty — never overwrites manual changes).
    await db.execute(sql`
      UPDATE "products" AS p
      SET "photo_carousel_paths" = j.value
      FROM jsonb_each(${JSON.stringify(photoCarouselMap)}::jsonb) AS j(key, value)
      WHERE p."slug" = j.key
        AND p."photo_carousel_paths" = '[]'::jsonb
    `)

    // One-shot data fill: derived fiche technique (only rows whose specs are
    // still empty — never overwrites manual edits).
    await db.execute(sql`
      UPDATE "products" AS p
      SET "specs" = j.value
      FROM jsonb_each(${JSON.stringify(productSpecsMap)}::jsonb) AS j(key, value)
      WHERE p."slug" = j.key
        AND p."specs" = '{}'::jsonb
    `)

    // ── Newsletter ── (subscribers / campaigns / campaign_sends)
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "subscriber_status" AS ENUM ('pending','subscribed','unsubscribed','bounced');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `)
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "campaign_status" AS ENUM ('draft','scheduled','sending','sent','failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "subscribers" (
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
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers" ("status")`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "subscribers_created_at_idx" ON "subscribers" ("created_at" DESC)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "subscribers_unsubscribe_token_idx" ON "subscribers" ("unsubscribe_token")`)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "campaigns" (
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
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" ("status")`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "campaigns_created_at_idx" ON "campaigns" ("created_at" DESC)`)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "campaign_sends" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
        "subscriber_id" uuid NOT NULL REFERENCES "subscribers"("id") ON DELETE CASCADE,
        "sent_at" timestamptz NOT NULL DEFAULT now(),
        "opened_at" timestamptz,
        "clicked_at" timestamptz,
        "unsubscribed_at" timestamptz,
        "error" text
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "campaign_sends_campaign_id_idx" ON "campaign_sends" ("campaign_id")`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "campaign_sends_subscriber_id_idx" ON "campaign_sends" ("subscriber_id")`)

    // ── Round 11 — email marketing fixes/upgrades ──
    // created_by was uuid but better-auth ids are TEXT → every campaign
    // INSERT with a creator failed. Convert in place (values, if any, cast).
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'campaigns' AND column_name = 'created_by'
            AND data_type = 'uuid'
        ) THEN
          ALTER TABLE "campaigns" ALTER COLUMN "created_by" TYPE text USING "created_by"::text;
        END IF;
      END $$;
    `)
    // Composer block state (email-blocks.ts).
    await db.execute(sql`ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "body_blocks" jsonb`)
    // Resumable sending needs exactly one row per campaign × subscriber.
    // Dedupe legacy duplicates (keep one arbitrary row), then enforce.
    await db.execute(sql`
      DELETE FROM "campaign_sends" a USING "campaign_sends" b
      WHERE a."campaign_id" = b."campaign_id"
        AND a."subscriber_id" = b."subscriber_id"
        AND a.ctid < b.ctid
    `)
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "campaign_sends_campaign_subscriber_uq"
        ON "campaign_sends" ("campaign_id", "subscriber_id")
    `)

    // ── Round 8 — free-form HTML block on the product page ──
    await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "custom_html" text`)

    // ── Round 8 — app settings KV (Brevo key, integrations…) ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" text PRIMARY KEY,
        "value" text,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    // ── Arabic catalogue (Phase 8) — additive AR columns + one-shot fill ──
    await db.execute(sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "name_ar" text`)
    await db.execute(sql`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description_ar" text`)
    await db.execute(sql`ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "statement_ar" text`)
    await db.execute(sql`ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "description_ar" text`)
    await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tagline_ar" text`)
    await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description_ar" text`)
    // One-shot fill: only rows whose AR is still null — never overwrites manual edits.
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

    console.log('[db] Schéma vérifié — permissions + image_blobs + galeries photos + newsletter + AR catalogue OK')
  } catch (err) {
    console.error('[db] ensure-schema failed (will retry next boot):', err)
  }
}
