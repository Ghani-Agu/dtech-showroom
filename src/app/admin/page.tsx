import type { Metadata } from 'next'
import Link from 'next/link'
import { count, desc, eq } from 'drizzle-orm'
import {
  CircleDashed,
  FolderOpen,
  MailQuestion,
  Package,
  Tag,
} from 'lucide-react'
import { InquiryListRow } from '@/components/admin/inquiries/InquiryListRow'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { Stat } from '@/components/admin/ui/Stat'
import { db } from '@/db/client'
import { brands, categories, inquiries, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Dashboard — Dtech Admin',
  robots: { index: false, follow: false },
}

async function getDashboardData() {
  const [
    productCount,
    brandCount,
    categoryCount,
    inquiryNewCount,
    inquiryTotalCount,
    recentInquiries,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(products)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(brands)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(categories)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'new'))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(inquiries)
      .then((r) => r[0]?.count ?? 0),
    db
      .select()
      .from(inquiries)
      .orderBy(desc(inquiries.submittedAt))
      .limit(5),
  ])

  return {
    productCount,
    brandCount,
    categoryCount,
    inquiryNewCount,
    inquiryTotalCount,
    recentInquiries,
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Dashboard
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Overview<span className="text-accent">.</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Products"
          value={data.productCount}
          icon={<Package size={16} />}
        />
        <Stat
          label="Brands"
          value={data.brandCount}
          icon={<Tag size={16} />}
        />
        <Stat
          label="Categories"
          value={data.categoryCount}
          icon={<FolderOpen size={16} />}
        />
        <Stat
          label="New inquiries"
          value={data.inquiryNewCount}
          hint={`${data.inquiryTotalCount} total`}
          icon={<MailQuestion size={16} />}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent inquiries</CardTitle>
              <CardDescription>
                Latest 5 inquiries submitted by customers.
              </CardDescription>
            </div>
            <Link
              href="/admin/inquiries"
              className="font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:text-text-primary"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {data.recentInquiries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CircleDashed
                size={32}
                className="mx-auto mb-3 text-text-muted"
              />
              <p className="font-body text-base text-text-secondary">
                No inquiries yet.
              </p>
              <p className="mt-1 font-body text-sm text-text-muted">
                Customer inquiries from the contact form will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-overlay">
              {data.recentInquiries.map((inquiry) => (
                <InquiryListRow key={inquiry.id} inquiry={inquiry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card variant="outline">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common admin tasks. Full CRUD interfaces in the relevant sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/products"
              className="block rounded-md bg-surface-base px-4 py-3 transition-colors hover:bg-surface-overlay"
            >
              <p className="font-body text-sm font-medium text-text-primary">
                Manage products
              </p>
              <p className="mt-1 font-body text-xs text-text-muted">
                Create, edit, and organize the catalog
              </p>
            </Link>
            <Link
              href="/admin/inquiries"
              className="block rounded-md bg-surface-base px-4 py-3 transition-colors hover:bg-surface-overlay"
            >
              <p className="font-body text-sm font-medium text-text-primary">
                Review inquiries
              </p>
              <p className="mt-1 font-body text-xs text-text-muted">
                Respond to customer questions
              </p>
            </Link>
            <Link
              href="/admin/brands"
              className="block rounded-md bg-surface-base px-4 py-3 transition-colors hover:bg-surface-overlay"
            >
              <p className="font-body text-sm font-medium text-text-primary">
                Manage brands
              </p>
              <p className="mt-1 font-body text-xs text-text-muted">
                Update brand info and imagery
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
