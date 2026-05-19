import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin-v2/ui'
import { ImportWizard } from '@/components/admin/products/import/ImportWizard'
import { getImportContext } from '@/server/admin-import-actions'

export const metadata: Metadata = {
  title: 'Import products · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function ImportProductsPage() {
  const context = await getImportContext()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Import' },
        ]}
        title="Bulk import"
        description="Upload a CSV or XLSX file of products. Auto-detects columns, validates each row, and commits everything in a single transaction."
      />

      <ImportWizard context={context} />
    </div>
  )
}
