import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { count, desc, eq, isNull } from 'drizzle-orm'
import {
  ArrowRight,
  FolderOpen,
  MailQuestion,
  Package,
  PlusCircle,
  Tag,
  Upload,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { brands, categories, inquiries, products } from '@/db/schema'
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
} from '@/components/admin-v2/ui'

export const metadata: Metadata = {
  title: 'Dashboard — Dtech Admin',
  robots: { index: false, follow: false },
}

async function getDashboardData() {
  const [
    productCountResult,
    brandCountResult,
    categoryCountResult,
    newInquiriesCountResult,
    recentInquiries,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(products)
      .where(isNull(products.archivedAt)),
    db
      .select({ count: count() })
      .from(brands)
      .where(isNull(brands.archivedAt)),
    db
      .select({ count: count() })
      .from(categories)
      .where(isNull(categories.archivedAt)),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'new')),
    db
      .select({
        id: inquiries.id,
        fullName: inquiries.fullName,
        productName: inquiries.productName,
        productBrand: inquiries.productBrand,
        submittedAt: inquiries.submittedAt,
        status: inquiries.status,
      })
      .from(inquiries)
      .orderBy(desc(inquiries.submittedAt))
      .limit(5),
  ])

  return {
    products: productCountResult[0]?.count ?? 0,
    brands: brandCountResult[0]?.count ?? 0,
    categories: categoryCountResult[0]?.count ?? 0,
    newInquiries: newInquiriesCountResult[0]?.count ?? 0,
    recentInquiries,
  }
}

const STATUS_LABEL: Record<
  'new' | 'contacted' | 'closed' | 'spam',
  string
> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
  spam: 'Spam',
}

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userName = session?.user?.name || 'there'
  const firstName = userName.split(' ')[0]

  const data = await getDashboardData()

  const hasWaitingInquiries = data.newInquiries > 0

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl font-medium text-text-primary tracking-tight">
          Hello, {firstName}<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-base text-text-secondary mt-2">
          {hasWaitingInquiries
            ? `You have ${data.newInquiries} new ${
                data.newInquiries === 1 ? 'message' : 'messages'
              } waiting for a response.`
            : 'Everything is up to date.'}
        </p>
      </div>

      {hasWaitingInquiries && (
        <Card className="border-accent/40 bg-gradient-to-br from-admin-surface-raised to-admin-surface-elevated">
          <div className="flex items-start gap-5">
            <div className="size-12 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
              <MailQuestion size={22} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle>Reply to your customers</CardTitle>
              <CardDescription className="mt-1">
                {data.newInquiries}{' '}
                {data.newInquiries === 1
                  ? 'customer is'
                  : 'customers are'}{' '}
                waiting to hear from you about products in your catalog.
              </CardDescription>
            </div>
            <Link href="/admin/inquiries">
              <Button variant="primary">
                Review messages
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl font-medium text-text-primary mb-5">
          Your catalog at a glance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Products"
            value={data.products}
            href="/admin/products"
            icon={Package}
            accent="primary"
          />
          <StatCard
            label="Brands"
            value={data.brands}
            href="/admin/brands"
            icon={Tag}
          />
          <StatCard
            label="Categories"
            value={data.categories}
            href="/admin/categories"
            icon={FolderOpen}
          />
          <StatCard
            label="New messages"
            value={data.newInquiries}
            href="/admin/inquiries"
            icon={MailQuestion}
            accent={hasWaitingInquiries ? 'warning' : undefined}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-xl font-medium text-text-primary">
            Recent customer messages
          </h2>
          {data.recentInquiries.length > 0 && (
            <Link
              href="/admin/inquiries"
              className="font-body text-sm text-accent hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        {data.recentInquiries.length === 0 ? (
          <Card>
            <EmptyState
              icon={MailQuestion}
              title="No messages yet"
              description="When customers send inquiries about your products, they will appear here."
            />
          </Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-admin-border">
              {data.recentInquiries.map((inq) => (
                <li key={inq.id}>
                  <Link
                    href={`/admin/inquiries/${inq.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-admin-surface-elevated transition-colors"
                  >
                    <div className="size-10 rounded-full bg-admin-surface-elevated flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-xs font-medium text-text-secondary uppercase">
                        {(inq.fullName || '?').slice(0, 1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium text-text-primary truncate">
                        {inq.fullName}
                      </p>
                      <p className="font-body text-xs text-text-muted truncate mt-0.5">
                        About {inq.productName} ({inq.productBrand})
                      </p>
                    </div>
                    <Badge
                      variant={
                        inq.status === 'new'
                          ? 'info'
                          : inq.status === 'spam'
                            ? 'error'
                            : 'default'
                      }
                    >
                      {STATUS_LABEL[inq.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-medium text-text-primary mb-5">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/products/new">
            <Card hover className="h-full">
              <div className="flex flex-col gap-3">
                <div className="size-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <PlusCircle size={18} className="text-accent" />
                </div>
                <CardTitle>Add a product</CardTitle>
                <CardDescription>
                  Create a new product entry in your catalog.
                </CardDescription>
              </div>
            </Card>
          </Link>
          <Link href="/admin/products/import">
            <Card hover className="h-full">
              <div className="flex flex-col gap-3">
                <div className="size-10 rounded-lg bg-admin-surface-elevated flex items-center justify-center">
                  <Upload size={18} className="text-text-secondary" />
                </div>
                <CardTitle>Import products</CardTitle>
                <CardDescription>
                  Bulk import multiple products from a spreadsheet.
                </CardDescription>
              </div>
            </Card>
          </Link>
          <Link href="/admin/inquiries">
            <Card hover className="h-full">
              <div className="flex flex-col gap-3">
                <div className="size-10 rounded-lg bg-admin-surface-elevated flex items-center justify-center">
                  <MailQuestion size={18} className="text-text-secondary" />
                </div>
                <CardTitle>Reply to customers</CardTitle>
                <CardDescription>
                  See messages from customers about your products.
                </CardDescription>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  href: string
  icon: typeof Package
  accent?: 'primary' | 'warning'
}

function StatCard({ label, value, href, icon: Icon, accent }: StatCardProps) {
  return (
    <Link href={href}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between mb-3">
          <Icon size={20} strokeWidth={1.5} className="text-text-muted" />
          {accent === 'warning' && value > 0 && (
            <span className="size-2 rounded-full bg-accent animate-pulse" />
          )}
        </div>
        <p className="font-display text-4xl font-medium text-text-primary tracking-tight">
          {value}
        </p>
        <p className="font-body text-sm text-text-secondary mt-1">{label}</p>
      </Card>
    </Link>
  )
}
