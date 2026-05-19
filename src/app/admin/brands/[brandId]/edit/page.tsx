import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader, Pill } from '@/components/admin-v2/ui'
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
    title: `Edit ${brand.name} · Dtech Admin`,
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Brands', href: '/admin/brands' },
          { label: 'Edit' },
        ]}
        title={brand.name}
        action={
          <div className="flex items-center gap-2">
            <Pill variant="default" withDot={false}>
              /{brand.slug}
            </Pill>
            {brand.archivedAt && <Pill variant="warning">Archived</Pill>}
          </div>
        }
      />

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
