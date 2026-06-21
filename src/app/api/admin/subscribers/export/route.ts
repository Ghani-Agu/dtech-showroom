import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { subscribers, type SubscriberStatus } from '@/db/schema'

/**
 * CSV export — protected by the better-auth session (same gate as the
 * admin pages). Filters mirror the list page's `status` and `q`
 * query params so "export current view" matches what the admin sees.
 *
 * Output: text/csv; charset=utf-8 with UTF-8 BOM so Excel opens it
 * with the right encoding by default.
 */
export async function GET(req: Request) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const rawStatus = url.searchParams.get('status') ?? 'all'
  const validStatuses: Array<'all' | SubscriberStatus> = [
    'all',
    'pending',
    'subscribed',
    'unsubscribed',
    'bounced',
  ]
  const status = (validStatuses as string[]).includes(rawStatus)
    ? (rawStatus as 'all' | SubscriberStatus)
    : 'all'
  const q = (url.searchParams.get('q') ?? '').trim()

  const conds: SQL[] = []
  if (status !== 'all') conds.push(eq(subscribers.status, status))
  if (q.length >= 2) {
    const pat = `%${q}%`
    const matchOr = or(
      ilike(subscribers.email, pat),
      ilike(subscribers.source, pat)
    )
    if (matchOr) conds.push(matchOr)
  }
  const whereSql =
    conds.length === 0
      ? undefined
      : conds.length === 1
        ? conds[0]
        : sql.join(conds, sql` AND `)

  const rows = await db
    .select({
      email: subscribers.email,
      locale: subscribers.locale,
      status: subscribers.status,
      source: subscribers.source,
      createdAt: subscribers.createdAt,
      confirmedAt: subscribers.confirmedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
    })
    .from(subscribers)
    .where(whereSql)
    .orderBy(subscribers.createdAt)

  const header = [
    'email',
    'locale',
    'status',
    'source',
    'created_at',
    'confirmed_at',
    'unsubscribed_at',
  ].join(',')
  const body = rows
    .map((r) =>
      [
        csvCell(r.email),
        csvCell(r.locale),
        csvCell(r.status),
        csvCell(r.source ?? ''),
        csvCell(r.createdAt?.toISOString() ?? ''),
        csvCell(r.confirmedAt?.toISOString() ?? ''),
        csvCell(r.unsubscribedAt?.toISOString() ?? ''),
      ].join(',')
    )
    .join('\n')
  const csv = `﻿${header}\n${body}`

  const filename = `subscribers-${status}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function csvCell(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
