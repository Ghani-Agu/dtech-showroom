import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
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

  if (!category) return { title: 'Catégorie introuvable' }

  return {
    title: `Modifier ${category.name} · Dtech Admin`,
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
    <div className="max-w-5xl space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-2 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Toutes les catégories
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Catégories / Modifier
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            {category.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="neutral">/{category.slug}</Badge>
            {category.archivedAt && (
              <Badge variant="warning">Masquée</Badge>
            )}
          </div>
        </div>
      </div>

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
