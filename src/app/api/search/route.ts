import { NextResponse, type NextRequest } from 'next/server'
import { searchProducts } from '@/server/queries'
import { defaultLocale, isValidLocale } from '@/i18n/config'
import { imgOr } from '@/lib/img'

export const dynamic = 'force-dynamic'

/** Lightweight product suggestions for the header search popover. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const rawLocale = req.nextUrl.searchParams.get('locale') ?? defaultLocale
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale

  if (q.length < 2) return NextResponse.json({ results: [] })

  const rows = await searchProducts(q, locale)
  return NextResponse.json({
    results: rows.slice(0, 8).map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      category: p.category.name,
      image: imgOr(p.cardImagePath),
    })),
  })
}
