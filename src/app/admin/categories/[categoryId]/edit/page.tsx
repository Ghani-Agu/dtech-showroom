import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { PageHeader, Pill } from '@/components/admin-v2/ui'
import { CategoryForm } from '@/components/admin/categories/CategoryForm'
import { db } from '@/db/client'
import { categories } from '@/db/schema'

interface PageProps {
  params: Promise<{ categoryId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { categoryId } = await params
  const category = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!category) return { title: 'Category not found' }

  return {
    title: `Edit ${category.name} · Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { categoryId } = await params

  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!category) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Categories', href: '/admin/categories' },
          { label: 'Edit' },
        ]}
        title={category.name}
        action={
          <div className="flex items-center gap-2">
            <Pill variant="default" withDot={false}>
              /{category.slug}
            </Pill>
            {category.archivedAt && <Pill variant="warning">Archived</Pill>}
          </div>
        }
      />

      <CategoryForm
        mode="edit"
        categoryId={category.id}
        initialValues={{
          slug: category.slug,
          name: category.name,
          description: category.description ?? '',
          searchKeywords: category.searchKeywords ?? '',
          nameFr: category.nameFr ?? '',
          descriptionFr: category.descriptionFr ?? '',
          searchKeywordsFr: category.searchKeywordsFr ?? '',
          sortOrder: category.sortOrder,
          heroImagePath: category.heroImagePath ?? '',
        }}
        isArchived={category.archivedAt !== null}
      />
    </div>
  )
}
