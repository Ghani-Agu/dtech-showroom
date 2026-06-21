import type { Metadata } from 'next'
import { BrandForm } from '@/components/admin/brands/BrandForm'

export const metadata: Metadata = {
  title: 'Nouvelle marque · Dtech Admin',
  robots: { index: false, follow: false },
}

export default function NewBrandPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Marques / Nouvelle
        </p>
        <h1 className="font-display text-3xl tracking-tight text-white">
          Nouvelle marque<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
      </div>

      <BrandForm mode="create" />
    </div>
  )
}
