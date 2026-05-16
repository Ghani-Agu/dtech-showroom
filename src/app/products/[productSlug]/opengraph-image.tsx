import { ImageResponse } from 'next/og'
import { db } from '@/db/client'
import { products, type Product, type Brand } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const alt = 'Dtech product'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type ProductWithBrand = Product & { brand: Brand }

export default async function Image({
  params,
}: {
  params: Promise<{ productSlug: string }>
}) {
  const { productSlug } = await params

  let product: ProductWithBrand | undefined = undefined
  try {
    const found = await db.query.products.findFirst({
      where: eq(products.slug, productSlug),
      with: { brand: true },
    })
    product = found ?? undefined
  } catch {
    product = undefined
  }

  const eyebrow = product
    ? `${product.brand.name.toUpperCase()} · DTECH`
    : 'DTECH · CINEMATIC SHOWROOM'
  const title = product?.name ?? 'Dtech Showroom'
  const tagline = product?.tagline ?? 'Hardware, presented properly.'

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
          {eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 80,
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
            {tagline}
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
