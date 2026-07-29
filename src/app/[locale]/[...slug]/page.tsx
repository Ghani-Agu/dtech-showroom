import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPublishedCustomByPath } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { SkinShell } from '@/components/skin/SkinShell'
import type { PageDoc } from '@/components/admin/editor/types'

/**
 * ISR, not `force-dynamic`.
 *
 * This page reads nothing request-specific — no cookies, no session, no
 * searchParams — so rendering it per visitor meant every single visit paid a
 * round trip from the Vercel function to Postgres before a byte reached the
 * browser. Prerendered and revalidated, Vercel answers from the edge cache
 * closest to the visitor and the database is touched only when the content
 * actually changes. `revalidate` is the safety net; the real freshness comes
 * from revalidateStorefront() in every admin mutation (src/lib/revalidate.ts).
 *
 * setRequestLocale() is what MAKES this possible: without it next-intl reads
 * the locale from request headers, which silently opts the route back into
 * dynamic rendering.
 */
export const revalidate = 300

/** See the product route: [] + dynamicParams = generate on demand, then cache. */
export function generateStaticParams(): { slug: string[] }[] {
  return []
}

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
  const { locale, slug } = await params
  setRequestLocale(locale)
  const path = '/' + (slug ?? []).join('/')
  const doc = (await getPublishedCustomByPath(path)) as
    | (PageDoc & Record<string, unknown>)
    | null
  if (!doc) return {}
  return { title: typeof doc.name === 'string' ? doc.name : undefined }
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const path = '/' + (slug ?? []).join('/')
  const doc = await getPublishedCustomByPath(path)
  if (!doc) notFound()
  return (
    <SkinShell locale={locale}>
      <PublishedPage doc={doc as unknown as PageDoc} />
    </SkinShell>
  )
}
