export const IMPORTABLE_FIELDS = {
  slug: { label: 'URL Slug', required: true },
  name: { label: 'Name (English)', required: true },
  brandSlug: { label: 'Brand (slug)', required: true },
  categorySlug: { label: 'Category (slug)', required: true },
  tier: { label: 'Tier (hero | featured | longtail)', required: true },

  tagline: { label: 'Tagline (English)', required: false },
  description: { label: 'Description (English)', required: false },
  cardSpec: { label: 'Card Spec (English)', required: false },
  searchKeywords: { label: 'Search Keywords (English)', required: false },

  nameFr: { label: 'Name (French)', required: false },
  taglineFr: { label: 'Tagline (French)', required: false },
  descriptionFr: { label: 'Description (French)', required: false },
  cardSpecFr: { label: 'Card Spec (French)', required: false },
  searchKeywordsFr: { label: 'Search Keywords (French)', required: false },

  featured: { label: 'Featured (true/false)', required: false },
  sortOrder: { label: 'Sort Order (number)', required: false },

  cardImagePath: { label: 'Card Image URL', required: false },
  heroImagePath: { label: 'Hero Image URL', required: false },

  seoTitle: { label: 'SEO Title', required: false },
  seoDescription: { label: 'SEO Description', required: false },
} as const

export type ImportableField = keyof typeof IMPORTABLE_FIELDS

const FIELD_ALIASES: Record<ImportableField, string[]> = {
  slug: ['slug', 'url slug', 'urlslug', 'product slug', 'url'],
  name: [
    'name',
    'product name',
    'name_en',
    'name (en)',
    'name (english)',
    'english name',
    'title',
  ],
  brandSlug: ['brand', 'brand slug', 'brand_slug', 'manufacturer'],
  categorySlug: [
    'category',
    'category slug',
    'category_slug',
    'product category',
  ],
  tier: ['tier', 'presentation tier', 'priority'],

  tagline: [
    'tagline',
    'subtitle',
    'tagline_en',
    'short description',
    'tagline (en)',
  ],
  description: [
    'description',
    'description_en',
    'long description',
    'product description',
    'description (en)',
  ],
  cardSpec: [
    'card spec',
    'card_spec',
    'spec summary',
    'short spec',
    'cardspec',
  ],
  searchKeywords: [
    'keywords',
    'search keywords',
    'search_keywords',
    'tags',
    'keywords_en',
  ],

  nameFr: [
    'name_fr',
    'name (fr)',
    'name (french)',
    'french name',
    'nom',
    'nom français',
  ],
  taglineFr: [
    'tagline_fr',
    'tagline (fr)',
    'subtitle_fr',
    'sous-titre',
  ],
  descriptionFr: [
    'description_fr',
    'description (fr)',
    'description française',
  ],
  cardSpecFr: ['card_spec_fr', 'card spec (fr)', 'spec_fr'],
  searchKeywordsFr: ['keywords_fr', 'search keywords (fr)', 'tags_fr'],

  featured: ['featured', 'is_featured', 'feature', 'highlighted'],
  sortOrder: [
    'sort',
    'order',
    'sort order',
    'sort_order',
    'position',
    'priority order',
  ],

  cardImagePath: [
    'card image',
    'card_image',
    'card image url',
    'thumbnail',
    'thumb',
    'image',
  ],
  heroImagePath: [
    'hero image',
    'hero_image',
    'hero image url',
    'main image',
    'large image',
  ],

  seoTitle: ['seo title', 'seo_title', 'meta title'],
  seoDescription: ['seo description', 'seo_description', 'meta description'],
}

export function autoMapHeaders(
  headers: string[]
): Map<string, ImportableField | null> {
  const result = new Map<string, ImportableField | null>()

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]+/g, ' ')

    let matched: ImportableField | null = null

    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      ImportableField,
      string[],
    ][]) {
      const isMatch = aliases.some((alias) => {
        const normalizedAlias = alias.toLowerCase().replace(/[_\s-]+/g, ' ')
        return normalized === normalizedAlias
      })

      if (isMatch) {
        matched = field
        break
      }
    }

    result.set(header, matched)
  }

  return result
}
