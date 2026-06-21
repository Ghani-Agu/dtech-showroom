import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ImportWizard } from '@/components/admin/products/import/ImportWizard'
import { getImportContext } from '@/server/admin-import-actions'

export const metadata: Metadata = {
  title: 'Importer des produits · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function ImportProductsPage() {
  const context = await getImportContext()

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Tous les produits
      </Link>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          Produits / Importation
        </p>
        <h1 className="font-display text-3xl tracking-tight text-white">
          Importation en masse<span className="text-[var(--admin-cyan)]">.</span>
        </h1>
        <p className="mt-4 max-w-2xl font-body text-base text-[var(--admin-text-secondary)]">
          Envoyez un fichier CSV ou XLSX de produits. Les colonnes sont
          détectées automatiquement, chaque ligne est validée, et tout est
          enregistré en une seule transaction.
        </p>
      </div>

      <ImportWizard context={context} />
    </div>
  )
}
