import { ImageResponse } from 'next/og'

// Node runtime (default) — postgres.js does not run on edge.
export const alt = 'Dtech Showroom — Hardware presented properly'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
          DTECH · CINEMATIC SHOWROOM
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
            Hardware, presented properly
            <span style={{ color: '#3ec5e0' }}>.</span>
          </div>
          <div style={{ fontSize: 28, opacity: 0.78, marginTop: 24 }}>
            The Dtech Algérie catalog.
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
