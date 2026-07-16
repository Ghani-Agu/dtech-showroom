/**
 * READ-ONLY export of the current catalogue state (all language columns) so
 * translations can be reconciled precisely. Writes catalogue-export.json.
 *
 *   pnpm tsx --env-file=.env.local scripts/export-catalogue.ts
 *
 * Safe: performs SELECTs only. No data is modified.
 */
import { writeFileSync } from 'node:fs'
import { asc } from 'drizzle-orm'
import { db } from '../src/db/client'
import { products, categories, brands } from '../src/db/schema'

function nn(v: unknown): number {
  return v === null || v === undefined || v === '' ? 0 : 1
}

async function main() {
  const prod = await db
    .select({
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      description: products.description,
      cardSpec: products.cardSpec,
      nameFr: products.nameFr,
      taglineFr: products.taglineFr,
      descriptionFr: products.descriptionFr,
      cardSpecFr: products.cardSpecFr,
      taglineAr: products.taglineAr,
      descriptionAr: products.descriptionAr,
    })
    .from(products)
    .orderBy(asc(products.slug))

  const cats = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      nameFr: categories.nameFr,
      descriptionFr: categories.descriptionFr,
      nameAr: categories.nameAr,
      descriptionAr: categories.descriptionAr,
    })
    .from(categories)
    .orderBy(asc(categories.slug))

  const brnds = await db
    .select({
      slug: brands.slug,
      name: brands.name,
      statement: brands.statement,
      description: brands.description,
      nameFr: brands.nameFr,
      statementFr: brands.statementFr,
      descriptionFr: brands.descriptionFr,
      statementAr: brands.statementAr,
      descriptionAr: brands.descriptionAr,
    })
    .from(brands)
    .orderBy(asc(brands.slug))

  const out = { products: prod, categories: cats, brands: brnds }
  writeFileSync('catalogue-export.json', JSON.stringify(out, null, 2) + '\n')

  // Console summary so you can see the state at a glance.
  const sum = (rows: Record<string, unknown>[], col: string) =>
    rows.reduce((n, r) => n + nn(r[col]), 0)

  console.log('━'.repeat(56))
  console.log(`products:   ${prod.length}`)
  console.log(
    `  base filled  → tagline ${sum(prod, 'tagline')}, desc ${sum(prod, 'description')}`
  )
  console.log(
    `  FR filled    → nameFr ${sum(prod, 'nameFr')}, taglineFr ${sum(prod, 'taglineFr')}, descFr ${sum(prod, 'descriptionFr')}`
  )
  console.log(
    `  AR filled    → taglineAr ${sum(prod, 'taglineAr')}, descAr ${sum(prod, 'descriptionAr')}`
  )
  console.log(`categories: ${cats.length}`)
  console.log(
    `  FR filled → nameFr ${sum(cats, 'nameFr')} · AR filled → nameAr ${sum(cats, 'nameAr')}`
  )
  console.log(`brands:     ${brnds.length}`)
  console.log(
    `  FR filled → statementFr ${sum(brnds, 'statementFr')} · AR filled → statementAr ${sum(brnds, 'statementAr')}`
  )
  console.log('━'.repeat(56))
  console.log('Sample product base (first row):')
  console.log(`  slug: ${prod[0]?.slug}`)
  console.log(`  name: ${prod[0]?.name}`)
  console.log(`  tagline: ${String(prod[0]?.tagline).slice(0, 70)}`)
  console.log('Sample category base (first 3 slugs):')
  console.log(
    '  ' + cats.slice(0, 3).map((c) => `${c.slug} = "${c.name}"`).join('  |  ')
  )
  console.log('Sample brand base (first 3 slugs):')
  console.log(
    '  ' + brnds.slice(0, 3).map((b) => `${b.slug} = "${b.name}"`).join('  |  ')
  )
  console.log('━'.repeat(56))
  console.log('Wrote catalogue-export.json')
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
