import type { Metadata } from 'next'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { Mailbox } from 'lucide-react'
import {
  PageHeader,
  SearchInput,
  FilterSelect,
  EmptyState,
  Avatar,
  Pill,
} from '@/components/admin-v2/ui'
import { db } from '@/db/client'
import { inquiries } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Messages · Dtech Admin',
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

const STATUS_VARIANT: Record<
  Exclude<StatusFilter, 'all'>,
  'info' | 'warning' | 'success' | 'default'
> = {
  new: 'info',
  contacted: 'warning',
  closed: 'success',
  spam: 'default',
}

const STATUS_LABEL: Record<Exclude<StatusFilter, 'all'>, string> = {
  new: 'New',
  contacted: 'In progress',
  closed: 'Closed',
  spam: 'Spam',
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={
          statusCounts.new > 0
            ? `${statusCounts.new} new ${statusCounts.new === 1 ? 'message' : 'messages'} waiting for a response.`
            : 'All messages from customer inquiries.'
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          paramName="q"
          placeholder="Search name, email, product..."
        />
        <FilterSelect
          paramName="status"
          label="Status"
          options={[
            { value: 'new', label: `New (${statusCounts.new})` },
            {
              value: 'contacted',
              label: `In progress (${statusCounts.contacted})`,
            },
            { value: 'closed', label: `Closed (${statusCounts.closed})` },
            { value: 'spam', label: `Spam (${statusCounts.spam})` },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-admin-surface-raised border border-admin-border rounded-2xl">
          <EmptyState
            icon={Mailbox}
            title={
              query
                ? `No messages match "${query}".`
                : status !== 'all'
                  ? `No ${status} messages.`
                  : 'No messages yet.'
            }
            description={
              query || status !== 'all'
                ? 'Try a different filter or search.'
                : 'Customer inquiries from the contact form will appear here.'
            }
          />
        </div>
      ) : (
        <div className="bg-admin-surface-raised border border-admin-border rounded-2xl divide-y divide-admin-border overflow-hidden">
          {rows.map((inq) => (
            <Link
              key={inq.id}
              href={`/admin/inquiries/${inq.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-admin-surface-elevated transition-colors"
            >
              <Avatar name={inq.fullName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <p className="font-body text-sm font-semibold text-admin-text-primary truncate">
                    {inq.fullName}
                  </p>
                  <p className="font-body text-xs text-admin-text-muted truncate">
                    {inq.email}
                  </p>
                </div>
                <p className="font-body text-xs text-admin-text-secondary mt-1 truncate">
                  About <strong className="text-admin-text-primary">{inq.productName}</strong>
                  {' · '}{inq.productBrand}
                </p>
                <p className="font-body text-sm text-admin-text-muted mt-1.5 line-clamp-2">
                  {inq.message}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-mono text-xs text-admin-text-muted">
                  {timeAgo(new Date(inq.submittedAt))}
                </span>
                <Pill variant={STATUS_VARIANT[inq.status]}>
                  {STATUS_LABEL[inq.status]}
                </Pill>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between pt-2"
        >
          <p className="font-body text-sm text-admin-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref(status, query, { page: String(page - 1) })}
                className="font-body text-sm text-admin-text-secondary transition-colors hover:text-admin-text-primary"
              >
                ← Previous
              </Link>
            )}
            <span className="font-mono text-sm text-admin-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref(status, query, { page: String(page + 1) })}
                className="font-body text-sm text-admin-text-secondary transition-colors hover:text-admin-text-primary"
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
