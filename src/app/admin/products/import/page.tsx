import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ImportWizard } from '@/components/admin/products/import/ImportWizard'
import { getImportContext } from '@/server/admin-import-actions'

export const metadata: Metadata = {
  title: 'Import products — Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function ImportProductsPage() {
  const context = await getImportContext()

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        All products
      </Link>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Products / Import
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Bulk import<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-2xl font-body text-base text-text-secondary">
          Upload a CSV or XLSX file of products. Auto-detects columns,
          validates each row, and commits everything in a single
          transaction.
        </p>
      </div>

      <ImportWizard context={context} />
    </div>
  )
}
