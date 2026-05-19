'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--admin-surface-elevated)',
          color: 'var(--admin-text-primary)',
          border: '1px solid var(--admin-border)',
        },
      }}
    />
  )
}
