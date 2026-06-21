import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedCustomByPath } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import type { PageDoc } from '@/components/admin/editor/types'

export const dynamic = 'force-dynamic'

interface CustomPageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

/**
 * Catch-all for editor-managed CUSTOM pages. Explicit routes (products,
 * categories, about, …) take precedence; anything else is matched here and
 * renders its published block document, or 404s if none exists.
 */
export async function generateMetadata({
  params,
}: CustomPageProps): Promise<Metadata> {
  const { slug } = await params
  const path = '/' + (slug ?? []).join('/')
  const doc = (await getPublishedCustomByPath(path)) as
    | (PageDoc & Record<string, unknown>)
    | null
  if (!doc) return {}
  return { title: typeof doc.name === 'string' ? doc.name : undefined }
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { slug } = await params
  const path = '/' + (slug ?? []).join('/')
  const doc = await getPublishedCustomByPath(path)
  if (!doc) notFound()
  return <PublishedPage doc={doc as unknown as PageDoc} />
}
