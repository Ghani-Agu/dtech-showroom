import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const csv = [
    [
      'slug',
      'name',
      'name_fr',
      'tagline',
      'tagline_fr',
      'description',
      'description_fr',
      'card_spec',
      'card_spec_fr',
      'search_keywords',
      'search_keywords_fr',
      'brand_slug',
      'category_slug',
      'tier',
      'featured',
      'sort_order',
      'card_image_path',
      'hero_image_path',
      'seo_title',
      'seo_description',
    ].join(','),
    [
      'hp-elitebook-840-g11',
      'HP EliteBook 840 G11',
      'HP EliteBook 840 G11',
      'Business performance with quiet design',
      'Performance professionnelle au design discret',
      'A long editorial description in English...',
      'Une longue description éditoriale en français...',
      'Intel Core Ultra 7 · 32GB · 1TB SSD',
      'Intel Core Ultra 7 · 32 Go · SSD 1 To',
      'business laptop ultraportable',
      'ordinateur portable professionnel',
      'hp',
      'laptops',
      'featured',
      'false',
      '200',
      '',
      '',
      '',
      '',
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(','),
  ].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="dtech-product-import-template.csv"',
    },
  })
}
