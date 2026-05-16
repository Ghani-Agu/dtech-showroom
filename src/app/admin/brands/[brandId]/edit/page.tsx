import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { BrandForm } from '@/components/admin/brands/BrandForm'
import { db } from '@/db/client'
import { brands } from '@/db/schema'

interface PageProps {
  params: Promise<{ brandId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { brandId } = await params
  const brand = await db
    .select({ name: brands.name })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!brand) return { title: 'Brand not found' }

  return {
    title: `Edit ${brand.name} — Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

export default async function EditBrandPage({ params }: PageProps) {
  const { brandId } = await params

  const brand = await db
    .select()
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!brand) notFound()

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/admin/brands"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        All brands
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Brands / Edit
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            {brand.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="neutral">/{brand.slug}</Badge>
            {brand.archivedAt && <Badge variant="warning">Archived</Badge>}
          </div>
        </div>
      </div>

      <BrandForm
        mode="edit"
        brandId={brand.id}
        initialValues={{
          slug: brand.slug,
          name: brand.name,
          statement: brand.statement ?? '',
          description: brand.description ?? '',
          searchKeywords: brand.searchKeywords ?? '',
          nameFr: brand.nameFr ?? '',
          statementFr: brand.statementFr ?? '',
          descriptionFr: brand.descriptionFr ?? '',
          searchKeywordsFr: brand.searchKeywordsFr ?? '',
          sortOrder: brand.sortOrder,
          logoPath: brand.logoPath ?? '',
          heroImagePath: brand.heroImagePath ?? '',
        }}
        isArchived={brand.archivedAt !== null}
      />
    </div>
  )
}
