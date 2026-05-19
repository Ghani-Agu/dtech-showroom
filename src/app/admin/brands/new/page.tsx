import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin-v2/ui'
import { BrandForm } from '@/components/admin/brands/BrandForm'

export const metadata: Metadata = {
  title: 'New brand · Dtech Admin',
  robots: { index: false, follow: false },
}

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Brands', href: '/admin/brands' },
          { label: 'New' },
        ]}
        title="New brand"
      />

      <BrandForm mode="create" />
    </div>
  )
}
