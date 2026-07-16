/**
 * Reconcile catalogue translations directly in the database.
 *
 * Ground truth (verified against the live site):
 *   - products   : base text is FRENCH, *_fr columns empty  → copy base→FR (clears
 *                  the "393 FR missing" flag), then set base→EN when catalogue-en.json
 *                  is present, and fill *_ar from catalogue-ar.json.
 *   - categories : already bilingual (EN base + FR nameFr)   → fill *_ar only.
 *   - brands     : already bilingual (EN base + FR statement)→ fill *_ar only.
 *
 * Idempotent & non-destructive: every fill is guarded so it never overwrites
 * existing content. Safe to run more than once. English is applied only if
 * src/db/catalogue-en.json exists (delivered separately) — run again after it lands.
 *
 *   pnpm tsx --env-file=.env.local scripts/fill-translations.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { db } from '../src/db/client'
import catalogueAr from '../src/db/catalogue-ar.json'

type EnEntry = { tagline?: string; description?: string }
const enPath = fileURLToPath(new URL('../src/db/catalogue-en.json', import.meta.url))
const catalogueEn: Record<string, EnEntry> | null = existsSync(enPath)
  ? (JSON.parse(readFileSync(enPath, 'utf8')) as Record<string, EnEntry>)
  : null

async function affected(result: unknown): Promise<number> {
  // postgres-js returns a RowList with .count; fall back to length
  const r = result as { count?: number; length?: number }
  return r.count ?? r.length ?? 0
}

async function main() {
  console.log('Reconciling catalogue translations…\n')

  // ── 1. PRODUCTS: preserve current French into the *_fr columns ──────────
  //    (base product text is French; this makes /fr explicit and clears the
  //     "Traduction FR manquante" health flag). COALESCE never overwrites.
  const fr = await db.execute(sql`
    UPDATE "products" SET
      "name_fr"            = COALESCE("name_fr", "name"),
      "tagline_fr"         = COALESCE("tagline_fr", "tagline"),
      "description_fr"     = COALESCE("description_fr", "description"),
      "card_spec_fr"       = COALESCE("card_spec_fr", "card_spec"),
      "search_keywords_fr" = COALESCE("search_keywords_fr", "search_keywords")
    WHERE "name_fr" IS NULL OR "tagline_fr" IS NULL OR "description_fr" IS NULL
       OR "card_spec_fr" IS NULL OR "search_keywords_fr" IS NULL
  `)
  console.log(`  products · French columns backfilled : ${await affected(fr)} row(s)`)

  // ── 2. PRODUCTS: Arabic ────────────────────────────────────────────────
  const par = await db.execute(sql`
    UPDATE "products" AS p SET
      "tagline_ar"     = j.value->>'taglineAr',
      "description_ar" = j.value->>'descriptionAr'
    FROM jsonb_each(${JSON.stringify(catalogueAr.products)}::jsonb) AS j(key, value)
    WHERE p."slug" = j.key AND (p."tagline_ar" IS NULL OR p."description_ar" IS NULL)
  `)
  console.log(`  products · Arabic filled             : ${await affected(par)} row(s)`)

  // ── 3. CATEGORIES: Arabic (EN/FR already present) ──────────────────────
  const car = await db.execute(sql`
    UPDATE "categories" AS c SET
      "name_ar"        = j.value->>'nameAr',
      "description_ar" = j.value->>'descriptionAr'
    FROM jsonb_each(${JSON.stringify(catalogueAr.categories)}::jsonb) AS j(key, value)
    WHERE c."slug" = j.key AND (c."name_ar" IS NULL OR c."description_ar" IS NULL)
  `)
  console.log(`  categories · Arabic filled           : ${await affected(car)} row(s)`)

  // ── 4. BRANDS: Arabic (EN/FR already present) ──────────────────────────
  const bar = await db.execute(sql`
    UPDATE "brands" AS b SET
      "statement_ar"   = j.value->>'statementAr',
      "description_ar" = j.value->>'descriptionAr'
    FROM jsonb_each(${JSON.stringify(catalogueAr.brands)}::jsonb) AS j(key, value)
    WHERE b."slug" = j.key AND (b."statement_ar" IS NULL OR b."description_ar" IS NULL)
  `)
  console.log(`  brands · Arabic filled               : ${await affected(bar)} row(s)`)

  // ── 5. PRODUCTS: English into the base columns (optional) ───────────────
  //    Only runs once catalogue-en.json is present. Step 1 already saved the
  //    French into *_fr, so overwriting the base with English is safe.
  if (catalogueEn) {
    const res = await db.execute(sql`
      UPDATE "products" AS p SET
        "tagline"     = j.value->>'tagline',
        "description" = j.value->>'description',
        "card_spec"   = CASE
                          WHEN length(j.value->>'tagline') > 70
                          THEN left(j.value->>'tagline', 68) || '…'
                          ELSE j.value->>'tagline'
                        END
      FROM jsonb_each(${JSON.stringify(catalogueEn)}::jsonb) AS j(key, value)
      WHERE p."slug" = j.key
        AND j.value->>'tagline' IS NOT NULL AND j.value->>'tagline' <> ''
    `)
    console.log(`  products · English base applied      : ${await affected(res)} row(s)`)
  } else {
    console.log('  products · English base              : skipped (catalogue-en.json not present yet)')
  }

  // ── Verification summary ───────────────────────────────────────────────
  const [pFr, pAr, cAr, bAr] = await Promise.all([
    db.execute(sql`SELECT count(*)::int AS n FROM "products" WHERE "name_fr" IS NOT NULL AND "name_fr" <> ''`),
    db.execute(sql`SELECT count(*)::int AS n FROM "products" WHERE "tagline_ar" IS NOT NULL AND "tagline_ar" <> ''`),
    db.execute(sql`SELECT count(*)::int AS n FROM "categories" WHERE "name_ar" IS NOT NULL AND "name_ar" <> ''`),
    db.execute(sql`SELECT count(*)::int AS n FROM "brands" WHERE "statement_ar" IS NOT NULL AND "statement_ar" <> ''`),
  ])
  const val = (r: unknown) => (r as Array<{ n: number }>)[0]?.n ?? 0
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Coverage now:')
  console.log(`  products with French name  : ${val(pFr)}`)
  console.log(`  products with Arabic       : ${val(pAr)}`)
  console.log(`  categories with Arabic     : ${val(cAr)}`)
  console.log(`  brands with Arabic         : ${val(bAr)}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
