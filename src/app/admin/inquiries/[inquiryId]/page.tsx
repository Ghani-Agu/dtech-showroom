import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import {
  ArrowLeft,
  Building2,
  Clock,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { InquiryNotesEditor } from '@/components/admin/inquiries/InquiryNotesEditor'
import { InquiryStatusControl } from '@/components/admin/inquiries/InquiryStatusControl'
import { db } from '@/db/client'
import { inquiries, inquiryStatusHistory, products } from '@/db/schema'

interface PageProps {
  params: Promise<{ inquiryId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { inquiryId } = await params
  const inquiry = await db
    .select({
      fullName: inquiries.fullName,
      productName: inquiries.productName,
    })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!inquiry) {
    return { title: 'Demande introuvable' }
  }

  return {
    title: `${inquiry.fullName} · Demandes · Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

const statusVariant = {
  new: 'accent' as const,
  contacted: 'success' as const,
  closed: 'neutral' as const,
  spam: 'error' as const,
}

const statusFr: Record<string, string> = {
  new: 'nouvelle',
  contacted: 'contactée',
  closed: 'clôturée',
  spam: 'indésirable',
}

export default async function InquiryDetailPage({ params }: PageProps) {
  const { inquiryId } = await params

  const inquiry = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1)
    .then((rows) => rows[0])
    .catch(() => null)

  if (!inquiry) notFound()

  const [product, history] = await Promise.all([
    db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.id, inquiry.productId))
      .limit(1)
      .then((rows) => rows[0])
      .catch(() => null),
    db
      .select()
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, inquiryId))
      .orderBy(desc(inquiryStatusHistory.createdAt))
      .catch(() => []),
  ])

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/admin/inquiries"
        className="inline-flex items-center gap-2 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Toutes les demandes
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Demande ·{' '}
            {new Intl.DateTimeFormat('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(inquiry.submittedAt))}
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            {inquiry.fullName}
          </h1>
        </div>
        <Badge variant={statusVariant[inquiry.status]}>
          {{ new: 'Nouvelle', contacted: 'Contactée', closed: 'Clôturée', spam: 'Indésirable' }[inquiry.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[var(--admin-text-tertiary)]" />
                <a
                  href={`mailto:${inquiry.email}?subject=Re: Demande concernant ${inquiry.productName}`}
                  className="font-body text-sm text-white transition-colors hover:text-[var(--admin-cyan)]"
                >
                  {inquiry.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[var(--admin-text-tertiary)]" />
                <a
                  href={`tel:${inquiry.phone}`}
                  className="font-body text-sm text-white transition-colors hover:text-[var(--admin-cyan)]"
                >
                  {inquiry.phone}
                </a>
              </div>
              {inquiry.company && (
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-[var(--admin-text-tertiary)]" />
                  <span className="font-body text-sm text-white">
                    {inquiry.company}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produit</CardTitle>
              <CardDescription>
                Le produit concerné par cette demande.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-base text-white">
                    {inquiry.productName}
                  </p>
                  <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
                    {inquiry.productBrand}
                  </p>
                </div>
                {product && (
                  <Link
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-body text-sm text-[var(--admin-text-secondary)] transition-colors hover:text-white"
                  >
                    Voir le produit
                    <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap font-body text-base leading-relaxed text-white">
                {inquiry.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes internes</CardTitle>
              <CardDescription>
                Notes pour l'équipe. Invisibles pour le client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InquiryNotesEditor
                inquiryId={inquiry.id}
                initialNotes={inquiry.notes ?? ''}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryStatusControl
                inquiryId={inquiry.id}
                currentStatus={inquiry.status}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {history.length === 0 ? (
                <p className="px-6 py-4 font-body text-sm text-[var(--admin-text-tertiary)]">
                  Aucune activité pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {history.map((h) => (
                    <li key={h.id} className="px-6 py-3">
                      <div className="flex items-start gap-2">
                        <Clock
                          size={12}
                          className="mt-1 flex-shrink-0 text-[var(--admin-text-tertiary)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm text-white">
                            {h.fromStatus
                              ? `${statusFr[h.fromStatus] ?? h.fromStatus} → ${statusFr[h.toStatus] ?? h.toStatus}`
                              : `Créée comme ${statusFr[h.toStatus] ?? h.toStatus}`}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[var(--admin-text-tertiary)]">
                            {h.changedByEmail ?? 'système'} ·{' '}
                            {new Intl.DateTimeFormat('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(h.createdAt))}
                          </p>
                          {h.note && (
                            <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
                              {h.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
