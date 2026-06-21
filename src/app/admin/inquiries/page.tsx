import type { Metadata } from 'next'
import Link from 'next/link'
import type { SQL } from 'drizzle-orm'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { Mailbox } from 'lucide-react'
import { InquiryListRow } from '@/components/admin/inquiries/InquiryListRow'
import { GlassCard } from '@/components/admin/GlassCard'
import { SectionTitle } from '@/components/admin/SectionTitle'
import { db } from '@/db/client'
import { inquiries } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Demandes · Dtech Admin',
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
    { value: 'all', label: 'Toutes' },
    { value: 'new', label: 'Nouvelles' },
    { value: 'contacted', label: 'Contactées' },
    { value: 'closed', label: 'Clôturées' },
    { value: 'spam', label: 'Indésirables' },
  ]

  return (
    <div className="space-y-8">
      <header>
        <p
          className="font-mono text-[11px] uppercase"
          style={{
            color: 'var(--admin-text-tertiary)',
            letterSpacing: '2px',
          }}
        >
          Demandes
        </p>
        <h1
          className="mt-2 font-display text-3xl font-light tracking-tight"
          style={{ color: 'var(--admin-text-primary)' }}
        >
          Demandes clients.
        </h1>
      </header>

      {/* Filter row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Filtrer par statut"
          className="glass-surface flex items-center gap-1 rounded-full p-1"
        >
          {statusTabs.map((tab) => {
            const isActive = status === tab.value
            const href = buildHref(tab.value, query)
            return (
              <Link
                key={tab.value}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                style={
                  isActive
                    ? {
                        background: 'rgba(34, 211, 238, 0.12)',
                        color: 'var(--admin-cyan)',
                      }
                    : { color: 'var(--admin-text-secondary)' }
                }
              >
                {tab.label}
                <span
                  className="font-mono text-[11px]"
                  style={{
                    color: isActive
                      ? 'var(--admin-cyan)'
                      : 'var(--admin-text-tertiary)',
                  }}
                >
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
          <label htmlFor="inquiry-search" className="sr-only">
            Rechercher des demandes
          </label>
          <input
            id="inquiry-search"
            type="search"
            name="q"
            placeholder="Rechercher nom, e-mail, produit…"
            defaultValue={query}
            className="glass-surface h-10 w-64 rounded-lg px-3 text-sm placeholder:text-[color:var(--admin-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            style={{ color: 'var(--admin-text-primary)' }}
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center py-16 text-center">
            <div
              className="mb-5 flex size-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--admin-soft-2)' }}
            >
              <Mailbox
                size={26}
                style={{ color: 'var(--admin-text-secondary)' }}
              />
            </div>
            <h2
              className="font-display text-xl font-light"
              style={{ color: 'var(--admin-text-primary)' }}
            >
              {query
                ? `Aucune demande ne correspond à « ${query} ».`
                : status !== 'all'
                  ? 'Aucune demande avec ce statut.'
                  : 'Aucune demande pour le moment.'}
            </h2>
            <p
              className="mt-2 max-w-md text-sm"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              {query || status !== 'all'
                ? 'Essayez un autre filtre ou une autre recherche.'
                : 'Les demandes clients envoyées via le formulaire de contact apparaîtront ici.'}
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          <SectionTitle className="sr-only">Liste des demandes</SectionTitle>
          <GlassCard padded={false} className="overflow-hidden">
            <ul>
              {rows.map((inquiry, idx) => {
                const isLast = idx === rows.length - 1
                return (
                  <li
                    key={inquiry.id}
                    style={{
                      borderBottom: isLast
                        ? 'none'
                        : '1px solid var(--admin-line)',
                    }}
                  >
                    <InquiryListRow inquiry={inquiry} />
                  </li>
                )
              })}
            </ul>
          </GlassCard>
        </>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between"
        >
          <p
            className="text-sm"
            style={{ color: 'var(--admin-text-tertiary)' }}
          >
            Affichage de {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} sur {total}
          </p>
          <div className="flex items-center gap-3">
            {page > 1 && (
              <Link
                href={buildHref(status, query, { page: String(page - 1) })}
                className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded"
                style={{ color: 'var(--admin-text-secondary)' }}
              >
                ← Précédent
              </Link>
            )}
            <span
              className="font-mono text-sm"
              style={{ color: 'var(--admin-text-tertiary)' }}
            >
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref(status, query, { page: String(page + 1) })}
                className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded"
                style={{ color: 'var(--admin-text-secondary)' }}
              >
                Suivant →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
