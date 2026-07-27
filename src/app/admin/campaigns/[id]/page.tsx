import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/db/client'
import { campaigns } from '@/db/schema'
import { getSessionUser } from '@/lib/auth-helpers'
import { hasAccess } from '@/lib/permissions'
import {
  getAudienceCounts,
  getCampaignProgress,
} from '@/server/campaign-send-core'
import { CampaignEditor } from '@/components/admin/campaigns/CampaignEditor'

export const dynamic = 'force-dynamic'
// The chunked send actions POST to this route — give them headroom on
// serverless (a chunk is ~5-8s; default budgets can be as low as 10s).
export const maxDuration = 60

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user || !hasAccess(user, 'newsletter')) redirect('/admin')

  const { id } = await params
  const campaign = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!campaign) notFound()

  const [counts, progress] = await Promise.all([
    getAudienceCounts(),
    getCampaignProgress(campaign),
  ])

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
        counts={counts}
        initialProgress={progress}
      />
    </div>
  )
}
