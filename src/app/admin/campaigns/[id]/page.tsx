import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/db/client'
import { campaigns } from '@/db/schema'
import { CampaignEditor } from '@/components/admin/campaigns/CampaignEditor'

export const dynamic = 'force-dynamic'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const campaign = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!campaign) notFound()

  const subscribedCountRow = await db.execute(
    `SELECT COUNT(*)::int AS c FROM subscribers WHERE status = 'subscribed'`
  )
  // drizzle's `execute` returns provider-specific shape; pull `c` defensively
  const subscribedCount = readCount(subscribedCountRow)

  return (
    <div className="space-y-5">
      <Link
        href="/admin/campaigns"
        className="inline-flex items-center gap-1 font-body text-[12.5px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
      >
        <ChevronLeft size={14} /> Toutes les campagnes
      </Link>

      <CampaignEditor
        campaign={campaign}
        subscribedCount={subscribedCount}
      />
    </div>
  )
}

function readCount(res: unknown): number {
  // postgres-js returns an array-like with the rows.
  if (Array.isArray(res)) {
    const first = res[0]
    if (first && typeof first === 'object' && 'c' in first) {
      return Number((first as { c: number }).c) || 0
    }
  }
  if (res && typeof res === 'object' && 'rows' in (res as Record<string, unknown>)) {
    const rows = (res as { rows: unknown[] }).rows
    if (Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' && 'c' in (rows[0] as Record<string, unknown>)) {
      return Number((rows[0] as { c: number }).c) || 0
    }
  }
  return 0
}
