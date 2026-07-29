import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { and, count, desc, eq, isNull, isNotNull, or } from 'drizzle-orm'
import {
  ArrowRight,
  CircleAlert,
  ExternalLink,
  EyeOff,
  FolderKanban,
  ImageOff,
  Languages,
  MessageSquare,
  Package,
  PackagePlus,
  Tag,
  Upload,
} from 'lucide-react'
import { getSessionUser } from '@/lib/auth-helpers'
import { db } from '@/db/client'
import { withDb, dbHealthSnapshot } from '@/db/health'
import { brands, categories, inquiries, products } from '@/db/schema'
import { GlassCard } from '@/components/admin/GlassCard'
import { StatCard, type StatAccent } from '@/components/admin/StatCard'
import { SectionTitle } from '@/components/admin/SectionTitle'
import { TIER_STYLES, type Tier } from '@/components/admin/tierStyles'

export const metadata: Metadata = {
  title: 'Tableau de bord · Dtech Admin',
  robots: { index: false, follow: false },
}

/**
 * A stalled DB link used to hold this render open until Vercel killed the
 * function at its 300s ceiling — five minutes of spinner, then a bare
 * "Une erreur est survenue". withDb() below bounds the queries; this bounds
 * everything else. Fail in seconds, show error.tsx, let the user retry.
 */
export const maxDuration = 30

const noPhoto = or(
  isNull(products.cardImagePath),
  eq(products.cardImagePath, '')
)
const noFr = or(isNull(products.nameFr), eq(products.nameFr, ''))

type Counts = {
  products: number
  brands: number
  categories: number
  newInquiries: number
  missingPhoto: number
  missingFr: number
  hidden: number
  featured: number
}

type TopCategory = { name: string; nameFr: string | null; n: number }
type LatestInquiry = {
  id: string
  fullName: string
  productName: string
  status: string
  submittedAt: Date
}
type RecentProduct = {
  id: string
  slug: string
  name: string
  tier: string
  cardImagePath: string | null
  brandName: string | null
}

const EMPTY_COUNTS: Counts = {
  products: 0,
  brands: 0,
  categories: 0,
  newInquiries: 0,
  missingPhoto: 0,
  missingFr: 0,
  hidden: 0,
  featured: 0,
}

/**
 * ROUND 22 — the dashboard must never reach error.tsx.
 *
 * d7bb514/13f65ce stopped this page riding the 300s Vercel ceiling, but they
 * left the failure mode intact: ONE `withDb()` around ELEVEN queries, and
 * nothing catching it. The moment the London link is slow enough to blow the
 * budget — or the breaker from a previous request is still open, which
 * rejects synchronously — the whole render throws and the admin sees
 * skeletons followed by « Une erreur est survenue », with no way to tell a
 * dead database from a dead deploy.
 *
 * Every other admin page degrades. This one now does too:
 *
 *   - the fan-out is split into THREE independent groups, so a slow join on
 *     the category histogram no longer costs you the four headline numbers;
 *   - every group is `.catch()`-ed to its empty value and reports `ok`;
 *   - each group is its own <Suspense> island, so the greeting and the quick
 *     actions paint immediately instead of waiting on the database at all.
 *
 * The page always renders. When something failed, a banner says so and the
 * affected panel says « indisponible » instead of lying with a zero.
 */
/**
 * Per-group budget. 8s is generous on a healthy link and 30x under the
 * function ceiling; `DB_DASHBOARD_TIMEOUT_MS` overrides it (set it to 1 to
 * rehearse the degraded page without breaking the database).
 */
function budget(fallbackMs: number): number {
  const raw = Number(process.env.DB_DASHBOARD_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : fallbackMs
}

async function guarded<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
  budgetMs: number
): Promise<{ ok: true; data: T } | { ok: false; data: T }> {
  try {
    return { ok: true, data: await withDb(run, budget(budgetMs)) }
  } catch (err) {
    console.warn(
      `[admin-dashboard] ${label} unavailable:`,
      err instanceof Error ? err.message : err
    )
    return { ok: false, data: fallback }
  }
}

/** Deduped per request: three components read the same counts. */
const countsOnce = cache(getCounts)
const feedsOnce = cache(getFeeds)

function getCounts() {
  // Eight cheap COUNTs. 8s is generous on a healthy link and still an order
  // of magnitude under the function ceiling.
  return guarded('counts', EMPTY_COUNTS, async () => {
    const [
      productCount,
      brandCount,
      categoryCount,
      newInquiries,
      missingPhoto,
      missingFr,
      hiddenCount,
      featuredCount,
    ] = await Promise.all([
      db.select({ n: count() }).from(products).where(isNull(products.archivedAt)),
      db.select({ n: count() }).from(brands).where(isNull(brands.archivedAt)),
      db.select({ n: count() }).from(categories).where(isNull(categories.archivedAt)),
      db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, 'new')),
      db.select({ n: count() }).from(products).where(and(isNull(products.archivedAt), noPhoto)),
      db.select({ n: count() }).from(products).where(and(isNull(products.archivedAt), noFr)),
      db.select({ n: count() }).from(products).where(isNotNull(products.archivedAt)),
      db
        .select({ n: count() })
        .from(products)
        .where(and(isNull(products.archivedAt), eq(products.featured, true))),
    ])

    return {
      products: productCount[0]?.n ?? 0,
      brands: brandCount[0]?.n ?? 0,
      categories: categoryCount[0]?.n ?? 0,
      newInquiries: newInquiries[0]?.n ?? 0,
      missingPhoto: missingPhoto[0]?.n ?? 0,
      missingFr: missingFr[0]?.n ?? 0,
      hidden: hiddenCount[0]?.n ?? 0,
      featured: featuredCount[0]?.n ?? 0,
    }
  }, 8_000)
}

function getTopCategories() {
  // The only join on the page, and the one most likely to be slow.
  return guarded('categories histogram', [] as TopCategory[], () =>
    db
      .select({ name: categories.name, nameFr: categories.nameFr, n: count(products.id) })
      .from(categories)
      .leftJoin(
        products,
        and(eq(products.categoryId, categories.id), isNull(products.archivedAt))
      )
      .where(isNull(categories.archivedAt))
      .groupBy(categories.id, categories.name, categories.nameFr)
      .orderBy(desc(count(products.id)))
      .limit(6),
    8_000
  )
}

function getFeeds() {
  return guarded(
    'feeds',
    { latestInquiries: [] as LatestInquiry[], recentProducts: [] as RecentProduct[] },
    async () => {
      const [latestInquiries, recentProducts] = await Promise.all([
        db
          .select({
            id: inquiries.id,
            fullName: inquiries.fullName,
            productName: inquiries.productName,
            status: inquiries.status,
            submittedAt: inquiries.submittedAt,
          })
          .from(inquiries)
          .orderBy(desc(inquiries.submittedAt))
          .limit(5),
        db
          .select({
            id: products.id,
            slug: products.slug,
            name: products.name,
            tier: products.tier,
            cardImagePath: products.cardImagePath,
            brandName: brands.name,
          })
          .from(products)
          .leftJoin(brands, eq(products.brandId, brands.id))
          .where(isNull(products.archivedAt))
          .orderBy(desc(products.updatedAt))
          .limit(5),
      ])
      return { latestInquiries, recentProducts }
    },
    8_000
  )
}

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return `il y a ${j} j`
}

interface StatusStyle {
  label: string
  bg: string
  color: string
}

const DEFAULT_STATUS: StatusStyle = {
  label: 'Nouvelle',
  bg: 'color-mix(in oklab, var(--c-amber) 14%, transparent)',
  color: 'var(--c-amber)',
}

const INQUIRY_STATUS: Record<string, StatusStyle> = {
  new: DEFAULT_STATUS,
  contacted: { label: 'Contactée', bg: 'color-mix(in oklab, var(--c-blue) 14%, transparent)', color: 'var(--c-blue)' },
  closed: { label: 'Clôturée', bg: 'color-mix(in oklab, var(--c-emerald) 14%, transparent)', color: 'var(--c-emerald-text)' },
  spam: { label: 'Indésirable', bg: 'var(--admin-soft-2)', color: 'var(--admin-text-secondary)' },
}

const BAR_COLORS = ['var(--c-mint)', 'var(--c-blue)', 'var(--c-violet)', 'var(--c-orange)', 'var(--c-rose)', 'var(--c-amber)']

/* ── page ─────────────────────────────────────────────────── */

/**
 * ROUND 22 — three <Suspense> islands, none of which can fail the page.
 *
 * The shell (greeting, quick actions, section titles) touches no database at
 * all, so it paints as soon as the session is known. Each island streams in
 * when its own query group answers, and each renders an "indisponible" state
 * rather than throwing when its group did not. `loading.tsx` still covers the
 * very first moment; what it no longer covers is a five-minute wait.
 */

function Unavailable({ what }: { what: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-5 py-6 font-body text-sm"
      style={{ color: 'var(--admin-text-tertiary)' }}
    >
      <CircleAlert size={15} style={{ color: 'var(--c-amber)' }} />
      {what} momentanément indisponible — la base de données ne répond pas.
    </div>
  )
}

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg"
          style={{ background: 'var(--admin-soft-2)' }}
        />
      ))}
    </div>
  )
}

/* ── island 1: the headline sentence + the four stat cards ── */

async function GreetingLine() {
  const { ok, data } = await countsOnce()
  if (!ok) {
    return (
      <p
        className="mt-2 max-w-[60ch] text-[15px]"
        style={{ color: 'var(--admin-text-secondary)' }}
      >
        Les chiffres du catalogue n’ont pas pu être chargés — la base de
        données ne répond pas pour le moment. Le reste de l’administration
        fonctionne normalement.
      </p>
    )
  }
  return (
    <p
      className="mt-2 max-w-[60ch] text-[15px]"
      style={{ color: 'var(--admin-text-secondary)' }}
    >
      {data.newInquiries > 0
        ? `${data.newInquiries} ${
            data.newInquiries === 1
              ? 'nouvelle demande attend'
              : 'nouvelles demandes attendent'
          } une réponse. Le catalogue compte ${data.products} produits en ligne.`
        : `Le catalogue est à jour : ${data.products} produits en ligne, répartis en ${data.categories} catégories.`}
    </p>
  )
}

async function StatGrid() {
  const { ok, data } = await countsOnce()

  // A hard 0 next to "chiffre indisponible" reads as "you have no products".
  // An em dash reads as "we could not ask".
  const n = (v: number): string | number => (ok ? v : '—')

  const stats: Array<{
    label: string
    value: string | number
    href: string
    icon: typeof Package
    accent: StatAccent
    hint?: string
  }> = [
    {
      label: 'Produits en ligne',
      value: n(data.products),
      href: '/admin/products',
      icon: Package,
      accent: 'blue',
      hint: ok ? `${data.featured} mis en avant` : 'chiffre indisponible',
    },
    {
      label: 'Marques',
      value: n(data.brands),
      href: '/admin/brands',
      icon: Tag,
      accent: 'violet',
      hint: ok ? 'partenaires distribués' : 'chiffre indisponible',
    },
    {
      label: 'Catégories',
      value: n(data.categories),
      href: '/admin/categories',
      icon: FolderKanban,
      accent: 'orange',
      hint: ok ? 'familles de produits' : 'chiffre indisponible',
    },
    {
      label: 'Demandes à traiter',
      value: n(data.newInquiries),
      href: '/admin/inquiries',
      icon: MessageSquare,
      accent: 'amber',
      hint: ok
        ? data.newInquiries > 0
          ? 'en attente de réponse'
          : 'tout est traité'
        : 'chiffre indisponible',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard
          key={s.label}
          label={s.label}
          value={s.value}
          href={s.href}
          icon={s.icon}
          accent={s.accent}
          hint={s.hint}
          live={ok}
        />
      ))}
    </div>
  )
}

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <GlassCard key={i} className="h-[118px] animate-pulse" />
      ))}
    </div>
  )
}

/* ── island 2: site health + category histogram ── */

async function HealthPanel() {
  const { ok, data } = await countsOnce()
  if (!ok) {
    return (
      <GlassCard padded={false} className="overflow-hidden">
        <Unavailable what="État du catalogue" />
      </GlassCard>
    )
  }

  const health = [
    {
      label: 'Produits sans photo',
      desc: 'Une photo manque sur la carte produit',
      count: data.missingPhoto,
      icon: ImageOff,
      color: 'var(--c-orange)',
      href: '/admin/products?flag=sans-photo',
    },
    {
      label: 'Traduction FR manquante',
      desc: 'Le site affiche le texte anglais',
      count: data.missingFr,
      icon: Languages,
      color: 'var(--c-violet)',
      href: '/admin/products?flag=sans-fr',
    },
    {
      label: 'Produits masqués',
      desc: 'Invisibles pour les visiteurs',
      count: data.hidden,
      icon: EyeOff,
      color: 'var(--c-rose)',
      href: '/admin/products?state=archived',
    },
  ]

  return (
    <GlassCard padded={false} className="overflow-hidden">
      {health.map((h, i) => (
        <Link
          key={h.label}
          href={h.href}
          className="group flex items-center gap-4 px-5 py-4 transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-white/[0.03]"
          style={{
            borderBottom:
              i === health.length - 1 ? 'none' : '1px solid var(--admin-line)',
          }}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${h.color} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${h.color} 35%, transparent)`,
              color: h.color,
            }}
          >
            <h.icon size={17} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[14px] font-semibold text-white">
              {h.label}
            </span>
            <span
              className="block truncate font-body text-xs"
              style={{ color: 'var(--admin-text-tertiary)' }}
            >
              {h.desc}
            </span>
          </span>
          {h.count > 0 ? (
            <span
              className="inline-flex min-w-9 items-center justify-center gap-1 rounded-full px-2.5 py-1 font-mono text-[13px] font-bold"
              style={{
                background: `color-mix(in oklab, ${h.color} 14%, transparent)`,
                color: h.color,
              }}
            >
              <CircleAlert size={12} />
              {h.count}
            </span>
          ) : (
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[11px]"
              style={{
                background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)',
                color: 'var(--c-emerald-text)',
              }}
            >
              OK
            </span>
          )}
          <ArrowRight
            size={15}
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--admin-text-tertiary)' }}
          />
        </Link>
      ))}
    </GlassCard>
  )
}

async function CategoriesPanel() {
  const { ok, data } = await getTopCategories()
  if (!ok) {
    return (
      <GlassCard padded={false} className="overflow-hidden">
        <Unavailable what="Répartition par catégorie" />
      </GlassCard>
    )
  }
  if (data.length === 0) {
    return (
      <GlassCard>
        <p
          className="py-4 text-center font-body text-sm"
          style={{ color: 'var(--admin-text-tertiary)' }}
        >
          Aucune catégorie pour le moment.
        </p>
      </GlassCard>
    )
  }

  const maxCat = Math.max(1, ...data.map((c) => c.n))

  return (
    <GlassCard className="space-y-4">
      {data.map((c, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length]
        const w = Math.max(4, Math.round((c.n / maxCat) * 100))
        return (
          <div key={c.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate font-body text-[13px] font-medium text-white">
                {c.nameFr ?? c.name}
              </span>
              <span className="font-mono text-[12px]" style={{ color }}>
                {c.n}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: 'var(--admin-soft-2)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent), ${color})`,
                  boxShadow: `0 0 12px color-mix(in oklab, ${color} 55%, transparent)`,
                }}
              />
            </div>
          </div>
        )
      })}
    </GlassCard>
  )
}

/* ── island 3: the two feeds ── */

async function InquiriesPanel() {
  const { ok, data } = await feedsOnce()
  if (!ok) {
    return (
      <GlassCard padded={false} className="overflow-hidden">
        <Unavailable what="Dernières demandes" />
      </GlassCard>
    )
  }
  const rows = data.latestInquiries

  return (
    <GlassCard padded={false} className="overflow-hidden">
      {rows.length === 0 ? (
        <div
          className="px-6 py-10 text-center text-sm"
          style={{ color: 'var(--admin-text-tertiary)' }}
        >
          Aucune demande pour le moment.
        </div>
      ) : (
        <ul>
          {rows.map((q, idx) => {
            const st = INQUIRY_STATUS[q.status] ?? DEFAULT_STATUS
            return (
              <li
                key={q.id}
                style={{
                  borderBottom:
                    idx === rows.length - 1
                      ? 'none'
                      : '1px solid var(--admin-line)',
                }}
              >
                <Link
                  href={`/admin/inquiries/${q.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-white/[0.03]"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-body text-[13px] font-bold"
                    style={{
                      background: `color-mix(in oklab, ${st.color} 14%, transparent)`,
                      color: st.color,
                    }}
                  >
                    {q.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-[13.5px] font-semibold text-white">
                      {q.fullName}
                    </span>
                    <span
                      className="block truncate font-body text-xs"
                      style={{ color: 'var(--admin-text-tertiary)' }}
                    >
                      {q.productName} · {timeAgo(q.submittedAt)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}

async function RecentProductsPanel() {
  const { ok, data } = await feedsOnce()
  if (!ok) {
    return (
      <GlassCard padded={false} className="overflow-hidden">
        <Unavailable what="Derniers produits modifiés" />
      </GlassCard>
    )
  }
  const rows = data.recentProducts

  return (
    <GlassCard padded={false} className="overflow-hidden">
      {rows.length === 0 ? (
        <div
          className="px-6 py-10 text-center text-sm"
          style={{ color: 'var(--admin-text-tertiary)' }}
        >
          Aucun produit pour le moment.
        </div>
      ) : (
        <ul>
          {rows.map((p, idx) => {
            const tier = TIER_STYLES[p.tier as Tier]
            return (
              <li
                key={p.id}
                style={{
                  borderBottom:
                    idx === rows.length - 1
                      ? 'none'
                      : '1px solid var(--admin-line)',
                }}
              >
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="flex h-14 items-center gap-4 px-5 transition-[transform,background-color] duration-200 hover:translate-x-1 hover:bg-white/[0.03]"
                >
                  <div
                    className="size-10 shrink-0 overflow-hidden rounded-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, color-mix(in oklab, var(--c-blue) 16%, transparent), color-mix(in oklab, var(--c-violet) 16%, transparent))',
                    }}
                  >
                    {p.cardImagePath && (
                      <Image
                        src={p.cardImagePath}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{p.name}</p>
                    <p
                      className="truncate text-xs"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      {p.brandName ?? '—'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${tier.bgClass} ${tier.textClass}`}
                    style={{ letterSpacing: '0.6px' }}
                  >
                    {tier.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}

/* ── the shell — no database call at all ── */

const ACTIONS = [
  { label: 'Nouveau produit', href: '/admin/products/new', icon: PackagePlus, color: 'var(--c-mint)' },
  { label: 'Importer un fichier', href: '/admin/products/import', icon: Upload, color: 'var(--c-blue)' },
  { label: 'Traiter les demandes', href: '/admin/inquiries', icon: MessageSquare, color: 'var(--c-amber)' },
  { label: 'Voir la boutique', href: '/', icon: ExternalLink, color: 'var(--c-violet)', external: true },
] as const

export default async function AdminDashboardPage() {
  // getSessionUser() — NOT auth.api.getSession(). This page was the only
  // admin route calling better-auth directly: a second, uncached, uncaught
  // session lookup on top of the one the layout already did. React cache()
  // makes it free here, and its .catch() means a database blip reads as
  // "signed out" instead of hanging the render forever.
  const sessionUser = await getSessionUser()
  const firstName = (sessionUser?.name || '').split(' ')[0]

  // Breaker already open from an earlier request? Say so once, at the top,
  // instead of letting three panels each report it separately.
  const dbDown = !dbHealthSnapshot().ok

  return (
    <div className="space-y-8">
      {dbDown ? (
        <div
          className="flex items-start gap-3 rounded-2xl border px-5 py-4 font-body text-sm"
          style={{
            borderColor: 'color-mix(in oklab, var(--c-amber) 40%, transparent)',
            background: 'color-mix(in oklab, var(--c-amber) 8%, transparent)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <CircleAlert size={17} style={{ color: 'var(--c-amber)', flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong className="text-white">La base de données ne répond pas.</strong>{' '}
            Les chiffres ci-dessous peuvent être incomplets. Le reste de
            l’administration reste utilisable — réessayez dans un instant.
          </span>
        </div>
      ) : null}

      {/* Hero greeting */}
      <GlassCard borderGlow className="relative overflow-hidden" padded={false}>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px overflow-hidden"
          style={{ borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
        >
          <div
            className="h-full w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--admin-cyan), var(--c-blue), transparent)',
              animation: 'admin-shimmer 3s linear 1s infinite',
              willChange: 'transform',
            }}
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6 p-7">
          <div>
            <p
              className="font-mono text-[11px] uppercase"
              style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
            >
              Bon retour
            </p>
            <h1
              className="mt-2 font-display text-[38px] font-extralight leading-[1.05] tracking-tight bg-gradient-to-r from-[var(--admin-text-primary)] via-[var(--c-mint)] to-[var(--c-blue)] bg-clip-text text-transparent"
              style={{ letterSpacing: '-0.02em' }}
            >
              Bonjour, {firstName}.
            </h1>
            <Suspense
              fallback={
                <div
                  className="mt-3 h-4 w-[46ch] max-w-full animate-pulse rounded"
                  style={{ background: 'var(--admin-soft-2)' }}
                />
              }
            >
              <GreetingLine />
            </Suspense>
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                {...('external' in a && a.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-[13px] font-semibold transition-[border-color,background,box-shadow,transform] duration-200 hover:-translate-y-px"
                style={{
                  color: a.color,
                  borderColor: `color-mix(in oklab, ${a.color} 40%, transparent)`,
                  background: `color-mix(in oklab, ${a.color} 10%, transparent)`,
                }}
              >
                <a.icon size={14} strokeWidth={2} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Stat grid */}
      <section>
        <SectionTitle className="mb-5">Aperçu du catalogue</SectionTitle>
        <Suspense fallback={<StatGridSkeleton />}>
          <StatGrid />
        </Suspense>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Left column — health + categories */}
        <div className="space-y-8">
          <section>
            <SectionTitle className="mb-5">Santé du site</SectionTitle>
            <Suspense
              fallback={
                <GlassCard padded={false}>
                  <PanelSkeleton />
                </GlassCard>
              }
            >
              <HealthPanel />
            </Suspense>
          </section>

          <section>
            <div className="mb-5 flex items-baseline justify-between">
              <SectionTitle>Répartition par catégorie</SectionTitle>
              <Link
                href="/admin/categories"
                className="rounded text-xs font-medium uppercase tracking-wide transition-colors hover:text-white"
                style={{ color: 'var(--admin-text-secondary)', letterSpacing: '1.2px' }}
              >
                Tout voir →
              </Link>
            </div>
            <Suspense
              fallback={
                <GlassCard padded={false}>
                  <PanelSkeleton rows={5} />
                </GlassCard>
              }
            >
              <CategoriesPanel />
            </Suspense>
          </section>
        </div>

        {/* Right column — inquiries + recent products */}
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex items-baseline justify-between">
              <SectionTitle>Dernières demandes</SectionTitle>
              <Link
                href="/admin/inquiries"
                className="rounded text-xs font-medium uppercase tracking-wide transition-colors hover:text-white"
                style={{ color: 'var(--admin-text-secondary)', letterSpacing: '1.2px' }}
              >
                Tout voir →
              </Link>
            </div>
            <Suspense
              fallback={
                <GlassCard padded={false}>
                  <PanelSkeleton />
                </GlassCard>
              }
            >
              <InquiriesPanel />
            </Suspense>
          </section>

          <section>
            <div className="mb-5 flex items-baseline justify-between">
              <SectionTitle>Derniers produits modifiés</SectionTitle>
              <Link
                href="/admin/products"
                className="rounded text-xs font-medium uppercase tracking-wide transition-colors hover:text-white"
                style={{ color: 'var(--admin-text-secondary)', letterSpacing: '1.2px' }}
              >
                Tout voir →
              </Link>
            </div>
            <Suspense
              fallback={
                <GlassCard padded={false}>
                  <PanelSkeleton />
                </GlassCard>
              }
            >
              <RecentProductsPanel />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  )
}
