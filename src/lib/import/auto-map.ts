export const IMPORTABLE_FIELDS = {
  slug: { label: 'Adresse URL (slug)', required: true },
  name: { label: 'Nom (anglais)', required: true },
  brandSlug: { label: 'Marque (slug)', required: true },
  categorySlug: { label: 'Catégorie (slug)', required: true },
  tier: { label: 'Mise en scène (hero | featured | longtail)', required: true },

  tagline: { label: 'Accroche (anglais)', required: false },
  description: { label: 'Description (anglais)', required: false },
  cardSpec: { label: 'Spécification carte (anglais)', required: false },
  searchKeywords: { label: 'Mots-clés (anglais)', required: false },

  nameFr: { label: 'Nom (français)', required: false },
  taglineFr: { label: 'Accroche (français)', required: false },
  descriptionFr: { label: 'Description (français)', required: false },
  cardSpecFr: { label: 'Spécification carte (français)', required: false },
  searchKeywordsFr: { label: 'Mots-clés (français)', required: false },

  featured: { label: 'Vedette (true/false)', required: false },
  sortOrder: { label: 'Ordre de tri (nombre)', required: false },

  cardImagePath: { label: 'URL photo carte', required: false },
  heroImagePath: { label: 'URL photo couverture', required: false },

  seoTitle: { label: 'Titre SEO', required: false },
  seoDescription: { label: 'Description SEO', required: false },
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
