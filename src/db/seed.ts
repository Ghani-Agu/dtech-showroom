import { db } from './client'
import {
  brands,
  categories,
  products,
  inquiries,
  type NewProduct,
} from './schema'
import { brandMeta, categoryMeta } from './seed-catalogue'
import catalogue from './catalogue.json'

try {
  process.loadEnvFile?.('.env.local')
} catch {
  // .env.local may not exist
}

interface CatalogueProduct {
  slug: string
  name: string
  brandSlug: string
  categorySlug: string
  tagline: string
  description: string
  cardSpec: string
  img: string
  label: string
  tier: 'hero' | 'featured' | 'longtail'
  featured: boolean
  sortOrder: number
}

const items = catalogue as CatalogueProduct[]

async function main() {
  console.log('Wiping inquiries, products, categories, brands...')
  await db.delete(inquiries)
  await db.delete(products)
  await db.delete(categories)
  await db.delete(brands)

  console.log(`Inserting ${brandMeta.length} brands...`)
  const insertedBrands = await db
    .insert(brands)
    .values(
      brandMeta.map((b) => ({
        slug: b.slug,
        name: b.name,
        statement: b.statement,
        statementFr: b.statementFr,
        description: b.description,
        descriptionFr: b.descriptionFr,
        heroImagePath: `/images/brands/${b.slug}/hero.webp`,
        logoPath: null,
        sortOrder: b.sortOrder,
        searchKeywords: b.name.toLowerCase(),
      }))
    )
    .returning()
  const brandIdBySlug = new Map(insertedBrands.map((b) => [b.slug, b.id]))

  console.log(`Inserting ${categoryMeta.length} categories...`)
  const insertedCategories = await db
    .insert(categories)
    .values(
      categoryMeta.map((c) => ({
        slug: c.slug,
        name: c.name,
        nameFr: c.nameFr,
        description: c.description,
        descriptionFr: c.descriptionFr,
        heroImagePath: `/images/categories/${c.slug}/hero.webp`,
        sortOrder: c.sortOrder,
      }))
    )
    .returning()
  const categoryIdBySlug = new Map(
    insertedCategories.map((c) => [c.slug, c.id])
  )

  const productRows: NewProduct[] = items.map((p) => {
    const brandId = brandIdBySlug.get(p.brandSlug)
    const categoryId = categoryIdBySlug.get(p.categorySlug)
    if (!brandId) throw new Error(`Brand not found: ${p.brandSlug} (${p.slug})`)
    if (!categoryId)
      throw new Error(`Category not found: ${p.categorySlug} (${p.slug})`)
    const catFr =
      categoryMeta.find((c) => c.slug === p.categorySlug)?.nameFr ?? ''
    return {
      slug: p.slug,
      name: p.name,
      // The official catalogue copy is French; it is also stored in the
      // canonical (EN) columns until English copy is written.
      tagline: p.tagline,
      taglineFr: p.tagline,
      description: p.description,
      descriptionFr: p.description,
      cardSpec: p.cardSpec,
      cardSpecFr: p.cardSpec,
      brandId,
      categoryId,
      tier: p.tier,
      featured: p.featured,
      specs: {},
      searchKeywords: [
        p.name.toLowerCase(),
        p.brandSlug.replace(/-/g, ' '),
        p.categorySlug.replace(/-/g, ' '),
        catFr.toLowerCase(),
      ].join(' '),
      sortOrder: p.sortOrder,
      cardImagePath: `/images/products/${p.slug}/card.webp`,
      heroImagePath: `/images/products/${p.slug}/hero.webp`,
      glbModelPath: null,
      photoCarouselPaths: [],
    }
  })

  console.log(`Inserting ${productRows.length} products...`)
  // chunked insert to stay under parameter limits
  for (let i = 0; i < productRows.length; i += 50) {
    await db.insert(products).values(productRows.slice(i, i + 50))
  }

  const byTier = {
    featured: productRows.filter((p) => p.tier === 'featured').length,
    longtail: productRows.filter((p) => p.tier === 'longtail').length,
  }
  console.log(`Done. ${JSON.stringify(byTier)}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
