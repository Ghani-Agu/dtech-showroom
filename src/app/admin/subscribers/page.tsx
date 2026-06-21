import type { Metadata } from 'next'
import { count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { GlassCard } from '@/components/admin/GlassCard'
import { SectionTitle } from '@/components/admin/SectionTitle'
import { db } from '@/db/client'
import { subscribers, type SubscriberStatus } from '@/db/schema'
import { SubscribersToolbar } from '@/components/admin/subscribers/SubscribersToolbar'
import { SubscriberRow } from '@/components/admin/subscribers/SubscriberRow'

export const metadata: Metadata = {
  title: 'Abonnés · Dtech Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type StatusFilter = 'all' | SubscriberStatus
const PAGE_SIZE = 30

const VALID: StatusFilter[] = ['all', 'pending', 'subscribed', 'unsubscribed', 'bounced']

interface PageProps {
  searchParams: Promise<{ status?: StatusFilter; q?: string; page?: string }>
}

export default async function SubscribersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status: StatusFilter = VALID.includes(
    (params.status ?? 'all') as StatusFilter
  )
    ? ((params.status ?? 'all') as StatusFilter)
    : 'all'
  const q = (params.q ?? '').trim()
  const pageNum = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  // ── counts per status (always all, for the chips) ─────────────────
  const allCounts = await db
    .select({ status: subscribers.status, c: count() })
    .from(subscribers)
    .groupBy(subscribers.status)
  const countMap: Record<string, number> = {}
  let total = 0
  for (const row of allCounts) {
    countMap[row.status] = Number(row.c)
    total += Number(row.c)
  }

  // ── list ──────────────────────────────────────────────────────────
  const conds: SQL[] = []
  if (status !== 'all') {
    conds.push(eq(subscribers.status, status))
  }
  if (q.length >= 2) {
    const pat = `%${q}%`
    const or1 = or(
      ilike(subscribers.email, pat),
      ilike(subscribers.source, pat)
    )
    if (or1) conds.push(or1)
  }
  const whereSql = conds.length === 0
    ? undefined
    : conds.length === 1
      ? conds[0]
      : sql.join(conds, sql` AND `)
  const offset = (pageNum - 1) * PAGE_SIZE

  const rows = await db
    .select()
    .from(subscribers)
    .where(whereSql)
    .orderBy(desc(subscribers.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  const totalRow = await db
    .select({ c: count() })
    .from(subscribers)
    .where(whereSql)
  const matchTotal = totalRow[0]?.c ?? 0
  const pageCount = Math.max(1, Math.ceil(Number(matchTotal) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <p
          className="font-mono text-[11px] uppercase"
          style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
        >
          Newsletter
        </p>
        <h1
          className="mt-1.5 font-display text-[28px] font-light leading-tight tracking-tight"
          style={{ color: 'var(--admin-text-primary)' }}
        >
          Abonnés
        </h1>
        <p
          className="mt-1.5 max-w-[60ch] font-body text-[13.5px]"
          style={{ color: 'var(--admin-text-secondary)' }}
        >
          {total} adresses au total · {countMap.subscribed ?? 0} confirmées
        </p>
      </div>

      <SubscribersToolbar
        status={status}
        q={q}
        counts={{
          all: total,
          pending: countMap.pending ?? 0,
          subscribed: countMap.subscribed ?? 0,
          unsubscribed: countMap.unsubscribed ?? 0,
          bounced: countMap.bounced ?? 0,
        }}
      />

      <GlassCard className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center font-body text-sm text-[var(--admin-text-tertiary)]">
            Aucun abonné ne correspond à ces critères.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-glass-border)]">
            {rows.map((s) => (
              <li key={s.id}>
                <SubscriberRow row={s} />
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-2 px-1 text-sm"
        >
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Page {pageNum} / {pageCount}
          </span>
          <span className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`?${qs({ status, q, page: pageNum - 1 })}`}
                className="rounded-full border border-[var(--admin-glass-border)] px-3 py-1.5 text-[var(--admin-text-secondary)] hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)]"
              >
                ← Précédent
              </a>
            )}
            {pageNum < pageCount && (
              <a
                href={`?${qs({ status, q, page: pageNum + 1 })}`}
                className="rounded-full border border-[var(--admin-glass-border)] px-3 py-1.5 text-[var(--admin-text-secondary)] hover:border-[var(--admin-glass-border-strong)] hover:text-[var(--admin-text-primary)]"
              >
                Suivant →
              </a>
            )}
          </span>
        </nav>
      )}
    </div>
  )
}

function qs(p: {
  status: StatusFilter
  q: string
  page: number
}): string {
  const sp = new URLSearchParams()
  if (p.status !== 'all') sp.set('status', p.status)
  if (p.q) sp.set('q', p.q)
  if (p.page > 1) sp.set('page', String(p.page))
  return sp.toString()
}
