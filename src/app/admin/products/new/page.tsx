import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { ProductForm } from '@/components/admin/products/ProductForm'
import { db } from '@/db/client'
import { brands, categories } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Nouveau produit · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function NewProductPage() {
  const [brandList, categoryList] = await Promise.all([
    db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
  ])

  return (
    <div className="max-w-[1200px] space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Produits / Nouveau
        </p>
        <h1 className="font-display text-3xl tracking-tight text-white">
          Nouveau produit<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
      </div>

      <ProductForm
        mode="create"
        brands={brandList}
        categories={categoryList}
      />
    </div>
  )
}
