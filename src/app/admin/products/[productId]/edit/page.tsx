import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { ProductForm } from '@/components/admin/products/ProductForm'
import { db } from '@/db/client'
import { brands, categories, products } from '@/db/schema'

interface PageProps {
  params: Promise<{ productId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { productId } = await params
  const product = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!product) return { title: 'Product not found' }

  return {
    title: `Edit ${product.name} — Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

export default async function EditProductPage({ params }: PageProps) {
  const { productId } = await params

  const [product, brandList, categoryList] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
      .then((rows) => rows[0])
      .catch(() => null),
    db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
  ])

  if (!product) notFound()

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        All products
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Products / Edit
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="neutral">/{product.slug}</Badge>
            {product.archivedAt && (
              <Badge variant="warning">Archived</Badge>
            )}
          </div>
        </div>
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        initialValues={{
          slug: product.slug,
          name: product.name,
          tagline: product.tagline ?? '',
          description: product.description ?? '',
          cardSpec: product.cardSpec ?? '',
          searchKeywords: product.searchKeywords ?? '',
          nameFr: product.nameFr ?? '',
          taglineFr: product.taglineFr ?? '',
          descriptionFr: product.descriptionFr ?? '',
          cardSpecFr: product.cardSpecFr ?? '',
          searchKeywordsFr: product.searchKeywordsFr ?? '',
          brandId: product.brandId,
          categoryId: product.categoryId,
          tier: product.tier,
          featured: product.featured,
          sortOrder: product.sortOrder,
          specs: product.specs ?? {},
          cardImagePath: product.cardImagePath ?? '',
          heroImagePath: product.heroImagePath ?? '',
          glbModelPath: product.glbModelPath ?? '',
          photoCarouselPaths: product.photoCarouselPaths ?? [],
          seoTitle: product.seoTitle ?? '',
          seoDescription: product.seoDescription ?? '',
        }}
        isArchived={product.archivedAt !== null}
        brands={brandList}
        categories={categoryList}
      />
    </div>
  )
}
