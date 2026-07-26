import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import {
  Activity,
  BarChart3,
  ExternalLink,
  Mail,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { db } from '@/db/client'
import { categories, inquiries, products, subscribers } from '@/db/schema'
import { getSessionUser } from '@/lib/auth-helpers'
import { GlassCard } from '@/components/admin/GlassCard'
import { StatCard } from '@/components/admin/StatCard'
import { SectionTitle } from '@/components/admin/SectionTitle'
import {
  getAiChatSettingsView,
  getAnalyticsSettingsView,
} from '@/server/admin-settings-actions'
import { TrendChart, type TrendPoint } from '@/components/admin/analytics/TrendChart'
import { CategoryBars } from '@/components/admin/analytics/CategoryBars'

export const metadata: Metadata = {
  title: 'Statistiques · Dtech Admin',
  robots: { index: false, follow: false },
}

const DAYS = 30

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Zero-filled day series — a gap in the data must read as 0, not as a break. */
function series(rows: { day: string; n: number }[], days = DAYS): TrendPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r.n]))
  const out: TrendPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const key = dayKey(d)
    out.push({ date: key, value: byDay.get(key) ?? 0 })
  }
  return out
}

async function getData() {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - (DAYS - 1))
  since.setUTCHours(0, 0, 0, 0)

  const [
    inquiryTotal,
    inquiryNew,
    inquiryWindow,
    subTotal,
    subConfirmed,
    subWindow,
    productTotal,
    topCategories,
    topProducts,
  ] = await Promise.all([
    db.select({ n: count() }).from(inquiries),
    db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, 'new')),
    db
      .select({
        day: sql<string>`to_char(${inquiries.submittedAt}, 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(inquiries)
      .where(gte(inquiries.submittedAt, since))
      .groupBy(sql`to_char(${inquiries.submittedAt}, 'YYYY-MM-DD')`),
    db.select({ n: count() }).from(subscribers),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.status, 'subscribed')),
    db
      .select({
        day: sql<string>`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(subscribers)
      .where(gte(subscribers.createdAt, since))
      .groupBy(sql`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`),
    db.select({ n: count() }).from(products).where(isNull(products.archivedAt)),
    db
      .select({
        name: categories.name,
        nameFr: categories.nameFr,
        n: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(eq(products.categoryId, categories.id), isNull(products.archivedAt))
      )
      .where(isNull(categories.archivedAt))
      .groupBy(categories.id, categories.name, categories.nameFr)
      .orderBy(desc(count(products.id)))
      .limit(8),
    db
      .select({
        productName: inquiries.productName,
        productSlug: inquiries.productSlug,
        n: count(),
      })
      .from(inquiries)
      .groupBy(inquiries.productName, inquiries.productSlug)
      .orderBy(desc(count()))
      .limit(8),
  ])

  return {
    inquiryTotal: inquiryTotal[0]?.n ?? 0,
    inquiryNew: inquiryNew[0]?.n ?? 0,
    inquirySeries: series(inquiryWindow),
    subTotal: subTotal[0]?.n ?? 0,
    subConfirmed: subConfirmed[0]?.n ?? 0,
    subSeries: series(subWindow),
    productTotal: productTotal[0]?.n ?? 0,
    topCategories,
    topProducts,
  }
}

export default async function AdminAnalyticsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?redirect=/admin/analytics')

  let data: Awaited<ReturnType<typeof getData>> | null = null
  try {
    data = await getData()
  } catch {
    // A DB hiccup shouldn't 500 a read-only dashboard.
    data = null
  }

  const [ga, aiChat] = await Promise.all([
    getAnalyticsSettingsView(),
    getAiChatSettingsView(),
  ])

  const inquiry30 = data?.inquirySeries.reduce((a, p) => a + p.value, 0) ?? 0
  const subs30 = data?.subSeries.reduce((a, p) => a + p.value, 0) ?? 0

  return (
    <div className="space-y-8">
      <header>
        <p
          className="font-mono text-[11px] uppercase"
          style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
        >
          Statistiques
        </p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-white">
          Ce que fait votre site.
        </h1>
        <p className="mt-2 max-w-prose font-body text-sm text-[var(--admin-text-secondary)]">
          Les chiffres ci-dessous viennent directement de votre base de données —
          ils sont exacts et disponibles même sans Google Analytics. GA ajoute
          par-dessus l&apos;audience&nbsp;: visiteurs, sources de trafic, pages
          vues.
        </p>
      </header>

      {/* ── GA / chat connection strip ─────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <ConnectionCard
          icon={BarChart3}
          title="Google Analytics 4"
          color="var(--c-blue)"
          connected={Boolean(ga?.configured && ga.enabled)}
          detail={
            ga?.configured
              ? ga.enabled
                ? `Propriété ${ga.measurementId} — suivi actif sur le site public.`
                : `Propriété ${ga.measurementId} configurée, mais le suivi est désactivé.`
              : "Aucun identifiant de mesure. Collez votre G-XXXXXXXXXX dans Réglages → Intégrations pour suivre l'audience."
          }
          externalHref={
            ga?.configured
              ? 'https://analytics.google.com/analytics/web/#/p/reports/reportinghub'
              : 'https://analytics.google.com/'
          }
          externalLabel={ga?.configured ? 'Voir les rapports' : 'Créer une propriété GA4'}
        />
        <ConnectionCard
          icon={Sparkles}
          title="Chat IA D-Tech"
          color="var(--c-violet)"
          connected={Boolean(aiChat?.configured && aiChat.enabled)}
          detail={
            aiChat?.configured
              ? aiChat.enabled
                ? 'La bulle de chat est visible sur le site public.'
                : 'Configuré, mais la bulle est masquée.'
              : (aiChat?.problem ??
                "Pas encore branché. Déployez l'application D-Tech AI, puis collez son adresse et la clé du canal Widget dans Réglages → Intégrations.")
          }
        />
      </div>

      {data === null ? (
        <GlassCard>
          <div className="px-2 py-6 text-center">
            <p className="font-body text-sm text-[var(--admin-text-secondary)]">
              Les statistiques ne sont pas disponibles pour le moment (base de
              données injoignable). Rechargez la page dans un instant.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Demandes — 30 jours"
              value={inquiry30}
              hint={`${data.inquiryTotal} au total · ${data.inquiryNew} non traitées`}
              icon={MessageSquare}
              accent="amber"
              href="/admin/inquiries"
              live
            />
            <StatCard
              label="Abonnés — 30 jours"
              value={subs30}
              hint={`${data.subConfirmed} confirmés sur ${data.subTotal}`}
              icon={Mail}
              accent="cyan"
              href="/admin/subscribers"
              live
            />
            <StatCard
              label="Produits en ligne"
              value={data.productTotal}
              hint={`${data.topCategories.length} catégories actives`}
              icon={Package}
              accent="blue"
              href="/admin/products"
              live
            />
            <StatCard
              label="Taux de confirmation"
              value={
                data.subTotal > 0
                  ? `${Math.round((data.subConfirmed / data.subTotal) * 100)} %`
                  : '—'
              }
              hint="Abonnés ayant validé leur e-mail"
              icon={TrendingUp}
              accent="violet"
              live
            />
          </div>

          <section className="space-y-4">
            <SectionTitle>
              <Activity size={13} strokeWidth={2} aria-hidden />
              Activité des 30 derniers jours
            </SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard>
                <div className="px-2 py-2">
                  <h3 className="font-display text-lg text-white">Demandes reçues</h3>
                  <p className="mt-1 font-body text-xs text-[var(--admin-text-tertiary)]">
                    Formulaires « Demander des informations » envoyés par jour.
                  </p>
                  <TrendChart
                    points={data.inquirySeries}
                    color="var(--c-amber)"
                    label="demandes"
                  />
                </div>
              </GlassCard>
              <GlassCard>
                <div className="px-2 py-2">
                  <h3 className="font-display text-lg text-white">
                    Inscriptions newsletter
                  </h3>
                  <p className="mt-1 font-body text-xs text-[var(--admin-text-tertiary)]">
                    Nouvelles inscriptions par jour, confirmées ou non.
                  </p>
                  <TrendChart
                    points={data.subSeries}
                    color="var(--c-mint)"
                    label="inscriptions"
                  />
                </div>
              </GlassCard>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>
              <Package size={13} strokeWidth={2} aria-hidden />
              Répartition du catalogue
            </SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard>
                <div className="px-2 py-2">
                  <h3 className="font-display text-lg text-white">
                    Produits par catégorie
                  </h3>
                  <CategoryBars
                    items={data.topCategories.map((c) => ({
                      label: c.nameFr || c.name,
                      value: Number(c.n),
                    }))}
                    color="var(--c-blue)"
                  />
                </div>
              </GlassCard>
              <GlassCard>
                <div className="px-2 py-2">
                  <h3 className="font-display text-lg text-white">
                    Produits les plus demandés
                  </h3>
                  <p className="mt-1 font-body text-xs text-[var(--admin-text-tertiary)]">
                    Classement par nombre de demandes d&apos;information reçues.
                  </p>
                  {data.topProducts.length === 0 ? (
                    <p className="mt-6 font-body text-sm text-[var(--admin-text-tertiary)]">
                      Aucune demande pour l&apos;instant.
                    </p>
                  ) : (
                    <CategoryBars
                      items={data.topProducts.map((p) => ({
                        label: p.productName ?? '—',
                        value: Number(p.n),
                        href: p.productSlug
                          ? `/products/${p.productSlug}`
                          : undefined,
                      }))}
                      color="var(--c-amber)"
                    />
                  )}
                </div>
              </GlassCard>
            </div>
          </section>
        </>
      )}

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-2">
          <div>
            <h3 className="font-display text-lg text-white">
              Configurer les intégrations
            </h3>
            <p className="mt-1 font-body text-sm text-[var(--admin-text-secondary)]">
              Google Analytics, chat IA et Brevo se règlent au même endroit.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 font-body text-sm text-white transition-colors hover:bg-white/[0.08]"
          >
            <Settings size={15} strokeWidth={1.8} />
            Réglages → Intégrations
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}

function ConnectionCard({
  icon: Icon,
  title,
  color,
  connected,
  detail,
  externalHref,
  externalLabel,
}: {
  icon: typeof BarChart3
  title: string
  color: string
  connected: boolean
  detail: string
  externalHref?: string
  externalLabel?: string
}) {
  return (
    <GlassCard>
      <div className="px-2 py-2">
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${color} 18%, transparent)`,
              color,
            }}
          >
            <Icon size={18} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base text-white">{title}</h3>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[1.4px]"
                style={
                  connected
                    ? {
                        borderColor: 'color-mix(in oklab, var(--c-emerald) 40%, transparent)',
                        background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)',
                        color: 'var(--c-emerald)',
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--admin-text-tertiary)',
                      }
                }
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{
                    background: connected ? 'var(--c-emerald)' : 'rgba(255,255,255,0.3)',
                  }}
                />
                {connected ? 'Connecté' : 'Inactif'}
              </span>
            </div>
            <p className="mt-1.5 font-body text-sm leading-relaxed text-[var(--admin-text-secondary)]">
              {detail}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link
                href="/admin/settings"
                className="font-body text-xs text-[var(--admin-cyan)] hover:underline"
              >
                Configurer
              </Link>
              {externalHref && externalLabel && (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-body text-xs text-[var(--admin-text-secondary)] hover:text-white"
                >
                  {externalLabel}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
