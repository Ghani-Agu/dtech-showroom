import type { Metadata } from 'next'
import { CategoryForm } from '@/components/admin/categories/CategoryForm'

export const metadata: Metadata = {
  title: 'Nouvelle catégorie · Dtech Admin',
  robots: { index: false, follow: false },
}

export default function NewCategoryPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Catégories / Nouvelle
        </p>
        <h1 className="font-display text-3xl tracking-tight text-white">
          Nouvelle catégorie<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
      </div>

      <CategoryForm mode="create" />
    </div>
  )
}
