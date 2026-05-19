import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { count, eq, desc, isNull, sql } from 'drizzle-orm'
import {
  Package,
  MailQuestion,
  Tag,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { products, brands, categories, inquiries } from '@/db/schema'
import {
  StatCard,
  Button,
  Pill,
  Avatar,
  EmptyState,
  Card,
} from '@/components/admin-v2/ui'

export const metadata: Metadata = {
  title: 'Dashboard · Dtech Admin',
  robots: { index: false, follow: false },
}

async function getDashboardData() {
  const [
    productTotal,
    productFeatured,
    brandTotal,
    categoryTotal,
    inquiryByStatus,
    recentInquiries,
    productsByBrand,
  ] = await Promise.all([
    db.select({ count: count() }).from(products).where(isNull(products.archivedAt)),
    db.select({ count: count() }).from(products).where(eq(products.featured, true)),
    db.select({ count: count() }).from(brands).where(isNull(brands.archivedAt)),
    db.select({ count: count() }).from(categories).where(isNull(categories.archivedAt)),
    db
      .select({
        status: inquiries.status,
        count: count(),
      })
      .from(inquiries)
      .groupBy(inquiries.status),
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
      .limit(6),
    db
      .select({
        brandName: brands.name,
        count: sql<number>`count(${products.id})::int`,
      })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(isNull(products.archivedAt))
      .groupBy(brands.name)
      .orderBy(desc(sql`count(${products.id})`)),
  ])

  const statusCounts = {
    new: 0,
    contacted: 0,
    closed: 0,
    spam: 0,
  }
  for (const row of inquiryByStatus) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count
    }
  }

  return {
    products: productTotal[0]?.count ?? 0,
    featuredProducts: productFeatured[0]?.count ?? 0,
    brands: brandTotal[0]?.count ?? 0,
    categories: categoryTotal[0]?.count ?? 0,
    newMessages: statusCounts.new,
    statusCounts,
    totalInquiries: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    recentInquiries,
    productsByBrand,
  }
}

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userName = session?.user?.name || 'there'
  const firstName = userName.split(' ')[0]

  const data = await getDashboardData()
  const hasWaitingMessages = data.newMessages > 0

  return (
    <div className="space-y-10">
      {/* Hero welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-admin-surface-raised to-admin-surface-elevated border border-admin-border p-8 md:p-10">
        <div className="absolute top-0 right-0 size-80 rounded-full bg-admin-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-admin-info/5 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-admin-text-muted mb-3">
              Welcome back
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-medium text-admin-text-primary tracking-tight">
              Hello, {firstName}
              <span className="text-admin-accent">.</span>
            </h1>
            <p className="font-body text-base text-admin-text-secondary mt-3 max-w-xl">
              {hasWaitingMessages
                ? `You have ${data.newMessages} new ${
                    data.newMessages === 1 ? 'message' : 'messages'
                  } waiting for a response. Your catalog has ${data.products} products across ${data.brands} brands.`
                : `Your catalog has ${data.products} products across ${data.brands} brands, organized in ${data.categories} categories. Everything is up to date.`}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {hasWaitingMessages && (
                <Link href="/admin/inquiries?status=new">
                  <Button variant="primary">
                    Reply to messages
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
              <Link href="/admin/products/new">
                <Button variant="secondary">
                  <Sparkles size={14} />
                  Add product
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stat grid */}
      <section>
        <h2 className="font-display text-xl font-medium text-admin-text-primary mb-5">
          Catalog overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Products"
            value={data.products}
            hint={`${data.featuredProducts} featured`}
            icon={Package}
            iconColor="accent"
            href="/admin/products"
          />
          <StatCard
            label="Brands"
            value={data.brands}
            icon={Tag}
            iconColor="info"
            href="/admin/brands"
          />
          <StatCard
            label="Categories"
            value={data.categories}
            icon={FolderOpen}
            iconColor="success"
            href="/admin/categories"
          />
          <StatCard
            label="New messages"
            value={data.newMessages}
            hint={`${data.totalInquiries} total`}
            icon={MailQuestion}
            iconColor={hasWaitingMessages ? 'warning' : 'accent'}
            href="/admin/inquiries"
          />
        </div>
      </section>

      {/* Two-column: Messages + Brand distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent messages */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-xl font-medium text-admin-text-primary">
              Recent messages
            </h2>
            <Link
              href="/admin/inquiries"
              className="font-body text-sm text-admin-accent hover:underline"
            >
              View all →
            </Link>
          </div>

          {data.recentInquiries.length === 0 ? (
            <div className="bg-admin-surface-raised border border-admin-border rounded-2xl">
              <EmptyState
                icon={MailQuestion}
                title="No messages yet"
                description="When customers send inquiries about your products, they will appear here."
              />
            </div>
          ) : (
            <div className="bg-admin-surface-raised border border-admin-border rounded-2xl divide-y divide-admin-border overflow-hidden">
              {data.recentInquiries.map((inq) => (
                <Link
                  key={inq.id}
                  href={`/admin/inquiries/${inq.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-admin-surface-elevated transition-colors"
                >
                  <Avatar name={inq.fullName || '?'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-admin-text-primary truncate">
                      {inq.fullName}
                    </p>
                    <p className="font-body text-xs text-admin-text-muted truncate mt-0.5">
                      About {inq.productName} · {inq.productBrand}
                    </p>
                  </div>
                  <Pill
                    variant={
                      inq.status === 'new'
                        ? 'info'
                        : inq.status === 'contacted'
                          ? 'warning'
                          : inq.status === 'closed'
                            ? 'success'
                            : 'default'
                    }
                  >
                    {inq.status === 'new'
                      ? 'New'
                      : inq.status === 'contacted'
                        ? 'In progress'
                        : inq.status === 'closed'
                          ? 'Closed'
                          : 'Spam'}
                  </Pill>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Brand distribution chart */}
        <div>
          <h2 className="font-display text-xl font-medium text-admin-text-primary mb-5">
            By brand
          </h2>
          <Card>
            {data.productsByBrand.length === 0 ? (
              <p className="font-body text-sm text-admin-text-muted">
                No products yet.
              </p>
            ) : (
              <div className="space-y-4">
                {data.productsByBrand.map((row) => {
                  const pct =
                    data.products > 0 ? (row.count / data.products) * 100 : 0
                  return (
                    <div key={row.brandName}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="font-body text-sm font-medium text-admin-text-primary">
                          {row.brandName}
                        </p>
                        <p className="font-mono text-xs text-admin-text-muted">
                          {row.count}
                        </p>
                      </div>
                      <div className="h-2 bg-admin-surface-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin-accent rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
