import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin-v2/ui'
import { CategoryForm } from '@/components/admin/categories/CategoryForm'

export const metadata: Metadata = {
  title: 'New category · Dtech Admin',
  robots: { index: false, follow: false },
}

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Categories', href: '/admin/categories' },
          { label: 'New' },
        ]}
        title="New category"
      />

      <CategoryForm mode="create" />
    </div>
  )
}
