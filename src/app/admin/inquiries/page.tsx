import type { Metadata } from 'next'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { CircleDashed } from 'lucide-react'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Input'
import { InquiryListRow } from '@/components/admin/inquiries/InquiryListRow'
import { db } from '@/db/client'
import { inquiries } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Inquiries — Dtech Admin',
  robots: { index: false, follow: false },
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'closed' | 'spam'

interface PageProps {
  searchParams: Promise<{
    status?: StatusFilter
    q?: string
    page?: string
  }>
}

const PAGE_SIZE = 25
const VALID_STATUSES: StatusFilter[] = [
  'all',
  'new',
  'contacted',
  'closed',
  'spam',
]

async function getInquiries(
  status: StatusFilter,
  query: string,
  page: number
) {
  const offset = (page - 1) * PAGE_SIZE

  const conditions: SQL[] = []

  if (status !== 'all') {
    conditions.push(eq(inquiries.status, status))
  }

  if (query && query.length >= 2) {
    const pattern = `%${query}%`
    const fieldMatch = or(
      ilike(inquiries.fullName, pattern),
      ilike(inquiries.email, pattern),
      ilike(inquiries.company, pattern),
      ilike(inquiries.productName, pattern),
      ilike(inquiries.productBrand, pattern),
      ilike(inquiries.message, pattern)
    )
    if (fieldMatch) conditions.push(fieldMatch)
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(inquiries)
      .where(whereClause)
      .orderBy(desc(inquiries.submittedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(inquiries).where(whereClause),
  ])

  return {
    rows,
    total: totalRow[0]?.count ?? 0,
  }
}

async function getStatusCounts() {
  const result = await db
    .select({ status: inquiries.status, count: count() })
    .from(inquiries)
    .groupBy(inquiries.status)

  const counts: Record<StatusFilter, number> = {
    all: 0,
    new: 0,
    contacted: 0,
    closed: 0,
    spam: 0,
  }

  for (const row of result) {
    counts[row.status] = Number(row.count)
    counts.all += Number(row.count)
  }

  return counts
}

function buildHref(
  status: StatusFilter,
  query: string,
  overrides: Record<string, string> = {}
) {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (query) params.set('q', query)
  for (const [k, v] of Object.entries(overrides)) {
    params.set(k, v)
  }
  const qs = params.toString()
  return '/admin/inquiries' + (qs ? `?${qs}` : '')
}

export default async function InquiriesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawStatus = params.status
  const status: StatusFilter =
    rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all'
  const query = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const [{ rows, total }, statusCounts] = await Promise.all([
    getInquiries(status, query, page),
    getStatusCounts(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusTabs: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'closed', label: 'Closed' },
    { value: 'spam', label: 'Spam' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Inquiries
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Customer inquiries<span className="text-accent">.</span>
        </h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1 rounded-md bg-surface-elevated p-1">
          {statusTabs.map((tab) => {
            const isActive = status === tab.value
            const href = buildHref(tab.value, query)
            return (
              <Link
                key={tab.value}
                href={href}
                className={
                  isActive
                    ? 'inline-flex items-center gap-2 rounded-md bg-surface-overlay px-3 py-1.5 font-body text-sm font-medium text-text-primary'
                    : 'inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-body text-sm text-text-secondary transition-colors hover:text-text-primary'
                }
              >
                {tab.label}
                <span className="font-mono text-xs text-text-muted">
                  {statusCounts[tab.value]}
                </span>
              </Link>
            )
          })}
        </nav>

        <form
          action="/admin/inquiries"
          method="GET"
          className="flex items-center gap-2"
        >
          {status !== 'all' && (
            <input type="hidden" name="status" value={status} />
          )}
          <Input
            type="search"
            name="q"
            placeholder="Search name, email, product..."
            defaultValue={query}
            className="w-64"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed
              size={40}
              className="mx-auto mb-4 text-text-muted"
            />
            <p className="font-body text-base text-text-secondary">
              {query
                ? `No inquiries match "${query}".`
                : status !== 'all'
                  ? `No ${status} inquiries.`
                  : 'No inquiries yet.'}
            </p>
            <p className="mt-1 font-body text-sm text-text-muted">
              {query || status !== 'all'
                ? 'Try a different filter or search.'
                : 'Customer inquiries from the contact form will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((inquiry) => (
              <InquiryListRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <p className="font-body text-sm text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref(status, query, { page: String(page - 1) })}
                className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref(status, query, { page: String(page + 1) })}
                className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
