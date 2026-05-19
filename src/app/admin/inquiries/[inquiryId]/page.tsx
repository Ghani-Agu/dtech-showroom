import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import {
  Building2,
  Clock,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react'
import {
  Avatar,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PageHeader,
  Pill,
} from '@/components/admin-v2/ui'
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
    return { title: 'Message not found' }
  }

  return {
    title: `${inquiry.fullName} · Messages · Dtech Admin`,
    robots: { index: false, follow: false },
  }
}

const STATUS_VARIANT: Record<
  'new' | 'contacted' | 'closed' | 'spam',
  'info' | 'warning' | 'success' | 'default'
> = {
  new: 'info',
  contacted: 'warning',
  closed: 'success',
  spam: 'default',
}

const STATUS_LABEL: Record<
  'new' | 'contacted' | 'closed' | 'spam',
  string
> = {
  new: 'New',
  contacted: 'In progress',
  closed: 'Closed',
  spam: 'Spam',
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
      .select({ slug: products.slug, cardImagePath: products.cardImagePath })
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
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Messages', href: '/admin/inquiries' },
          {
            label: new Intl.DateTimeFormat('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(inquiry.submittedAt)),
          },
        ]}
        title={inquiry.fullName}
        action={
          <Pill variant={STATUS_VARIANT[inquiry.status]}>
            {STATUS_LABEL[inquiry.status]}
          </Pill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar name={inquiry.fullName} size="lg" />
                <div className="flex-1 space-y-2">
                  <p className="font-body text-base font-medium text-admin-text-primary">
                    {inquiry.fullName}
                  </p>
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-admin-text-muted" />
                    <a
                      href={`mailto:${inquiry.email}?subject=Re: Inquiry about ${inquiry.productName}`}
                      className="font-body text-sm text-admin-text-primary transition-colors hover:text-admin-accent"
                    >
                      {inquiry.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-admin-text-muted" />
                    <a
                      href={`tel:${inquiry.phone}`}
                      className="font-body text-sm text-admin-text-primary transition-colors hover:text-admin-accent"
                    >
                      {inquiry.phone}
                    </a>
                  </div>
                  {inquiry.company && (
                    <div className="flex items-center gap-3">
                      <Building2
                        size={14}
                        className="text-admin-text-muted"
                      />
                      <span className="font-body text-sm text-admin-text-primary">
                        {inquiry.company}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap font-body text-base leading-relaxed text-admin-text-primary">
                {inquiry.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Change the inquiry status as you work through it.
              </CardDescription>
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
              <CardTitle>Internal notes</CardTitle>
              <CardDescription>
                Notes for the team. Not visible to the customer.
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

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-body text-base font-medium text-admin-text-primary">
                  {inquiry.productName}
                </p>
                <p className="mt-1 font-body text-sm text-admin-text-secondary">
                  {inquiry.productBrand}
                </p>
                {product && (
                  <Link
                    href={`/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 font-body text-sm text-admin-accent hover:underline"
                  >
                    View product page
                    <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <dt className="text-admin-text-muted uppercase tracking-wider">
                    Submitted
                  </dt>
                  <dd className="text-admin-text-secondary">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(inquiry.submittedAt))}
                  </dd>
                </div>
                {inquiry.contactedAt && (
                  <div className="flex justify-between">
                    <dt className="text-admin-text-muted uppercase tracking-wider">
                      Contacted
                    </dt>
                    <dd className="text-admin-text-secondary">
                      {new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(inquiry.contactedAt))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card padded={false}>
            <div className="px-6 pt-6 pb-3">
              <CardTitle>Activity</CardTitle>
            </div>
            {history.length === 0 ? (
              <p className="px-6 py-4 font-body text-sm text-admin-text-muted">
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-admin-border">
                {history.map((h) => (
                  <li key={h.id} className="px-6 py-3">
                    <div className="flex items-start gap-2">
                      <Clock
                        size={12}
                        className="mt-1 flex-shrink-0 text-admin-text-muted"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-admin-text-primary">
                          {h.fromStatus
                            ? `${h.fromStatus} → ${h.toStatus}`
                            : `Created as ${h.toStatus}`}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-admin-text-muted">
                          {h.changedByEmail ?? 'system'} ·{' '}
                          {new Intl.DateTimeFormat('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(h.createdAt))}
                        </p>
                        {h.note && (
                          <p className="mt-1 font-body text-sm text-admin-text-secondary">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
