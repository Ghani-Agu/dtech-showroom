import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { Mail } from 'lucide-react'
import { GlassCard } from '@/components/admin/GlassCard'
import { db } from '@/db/client'
import { campaigns } from '@/db/schema'
import { getSessionUser } from '@/lib/auth-helpers'
import { hasAccess } from '@/lib/permissions'
import { CreateCampaignButton } from '@/components/admin/campaigns/CreateCampaignButton'
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge'

export const metadata: Metadata = {
  title: 'Campagnes · Dtech Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const user = await getSessionUser()
  if (!user || !hasAccess(user, 'newsletter')) redirect('/admin')

  const rows = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
            Campagnes
          </h1>
          <p
            className="mt-1.5 max-w-[60ch] font-body text-[13.5px]"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            Rédigez un email, prévisualisez, envoyez à vos abonnés.
          </p>
        </div>
        <CreateCampaignButton />
      </div>

      <GlassCard className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center font-body text-sm text-[var(--admin-text-tertiary)]">
            <Mail
              size={26}
              className="mx-auto mb-3 opacity-50"
              aria-hidden
            />
            Aucune campagne pour l’instant. Créez votre première campagne.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--admin-glass-border)]">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/campaigns/${c.id}`}
                  className="block px-6 py-4 transition-[transform,background-color] hover:translate-x-0.5 hover:bg-[color-mix(in_oklab,var(--c-mint)_4%,transparent)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-body text-[14.5px] font-semibold text-[var(--admin-text-primary)]">
                        {c.subject}
                      </div>
                      {c.preheader && (
                        <div className="mt-0.5 truncate font-body text-[12.5px] text-[var(--admin-text-tertiary)]">
                          {c.preheader}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      {c.status === 'sent' && (
                        <span className="font-mono text-[11px] text-[var(--admin-text-tertiary)]">
                          {c.sentCount} envoyés · {c.openCount} ouverts · {c.clickCount} clics
                        </span>
                      )}
                      {c.status === 'sending' && (
                        <span className="font-mono text-[11px] text-[var(--c-amber)]">
                          {c.sentCount} envoyés · en cours
                        </span>
                      )}
                      {c.status === 'scheduled' &&
                        c.scheduledFor &&
                        c.scheduledFor.getTime() < Date.now() && (
                          <span className="rounded-full border border-[color-mix(in_oklab,var(--c-amber)_45%,transparent)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--c-amber)]">
                            en retard
                          </span>
                        )}
                      <CampaignStatusBadge status={c.status} />
                    </div>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[var(--admin-text-tertiary)]">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {c.status === 'scheduled' && c.scheduledFor && (
                      <>
                        {' · '}
                        programmée le{' '}
                        {new Date(c.scheduledFor).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </>
                    )}
                    {c.sentAt && (
                      <>
                        {' · '}
                        envoyée le {new Date(c.sentAt).toLocaleDateString('fr-FR')}
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
