'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void error
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '4rem 2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0d',
          color: '#f5f5f3',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '36rem', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              opacity: 0.6,
              marginBottom: '0.5rem',
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}
          >
            The site couldn&apos;t load
            <span style={{ color: '#3ec5e0' }}>.</span>
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              opacity: 0.78,
              marginBottom: '2rem',
            }}
          >
            Something fundamental went wrong. Try reloading; if it persists, email
            contact@d-techalgerie.com.
          </p>
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: '1px solid rgba(245, 245, 243, 0.4)',
              color: '#f5f5f3',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
