import { ImageResponse } from 'next/og'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { categories } from '@/db/schema'

export const alt = 'Dtech category'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function firstSentence(text: string): string {
  const match = text.match(/^[^.]*\./)
  return match ? match[0] : text
}

export default async function Image({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}) {
  const { categorySlug } = await params

  let category: Awaited<
    ReturnType<typeof db.query.categories.findFirst>
  > = undefined
  try {
    category = await db.query.categories.findFirst({
      where: and(
        eq(categories.slug, categorySlug),
        isNull(categories.archivedAt)
      ),
    })
  } catch {
    category = undefined
  }

  const title = category?.name ?? 'Categories'
  const description = category
    ? firstSentence(category.description)
    : 'The Dtech catalog, sorted by intent.'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0d 0%, #14141a 100%)',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
          color: '#f5f5f3',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          CATEGORY · DTECH
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            {title}
            <span style={{ color: '#3ec5e0' }}>.</span>
          </div>
          <div style={{ fontSize: 28, opacity: 0.78, marginTop: 24 }}>
            {description}
          </div>
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            opacity: 0.5,
          }}
        >
          d-techalgerie.com
        </div>
      </div>
    ),
    { ...size }
  )
}
