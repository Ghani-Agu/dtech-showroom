import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { PageHeader } from '@/components/admin-v2/ui'
import { NewProductForm } from '@/components/admin-v2/products/NewProductForm'
import { db } from '@/db/client'
import { brands, categories } from '@/db/schema'

export const metadata: Metadata = {
  title: 'New product · Dtech Admin',
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: 'New' },
        ]}
        title="New product"
        description="Just the essentials to get started — fill in the rest after."
      />

      <NewProductForm brands={brandList} categories={categoryList} />
    </div>
  )
}
