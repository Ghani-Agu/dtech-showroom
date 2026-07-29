import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { and, count, desc, eq, isNull, isNotNull, or, sql } from 'drizzle-orm'
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
  Star,
  Tag,
  Upload,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/db/client'
import { brands, categories, inquiries, products } from '@/db/schema'
import { GlassCard } from '@/components/admin/GlassCard'
import { StatCard, type StatAccent } from '@/components/admin/StatCard'
import { SectionTitle } from '@/components/admin/SectionTitle'
import { TIER_STYLES, type Tier } from '@/components/admin/tierStyles'

export const metadata: Metadata = {
  title: 'Tableau de bord · Dtech Admin',
  robots: { index: false, follow: false },
}

const noPhoto = or(
  isNull(products.cardImagePath),
  eq(products.cardImagePath, '')
)
const noFr = or(isNull(products.nameFr), eq(products.nameFr, ''))

async function getDashboardData() {
  const [
    productCount,
    brandCount,
    categoryCount,
    newInquiries,
    missingPhoto,
    missingFr,
    hiddenCount,
    featuredCount,
    topCategories,
    latestInquiries,
    recentProducts,
  ] = await Promise.all([
    db.select({ n: count() }).from(products).where(isNull(products.archivedAt)),
    db.select({ n: count() }).from(brands).where(isNull(brands.archivedAt)),
    db.select({ n: count() }).from(categories).where(isNull(categories.archivedAt)),
    db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, 'new')),
    db.select({ n: count() }).from(products).where(and(isNull(products.archivedAt), noPhoto)),
    db.select({ n: count() }).from(products).where(and(isNull(products.archivedAt), noFr)),
    db.select({ n: count() }).from(products).where(isNotNull(products.archivedAt)),
    db.select({ n: count() }).from(products).where(and(isNull(products.archivedAt), eq(products.featured, true))),
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

  return {
    products: productCount[0]?.n ?? 0,
    brands: brandCount[0]?.n ?? 0,
    categories: categoryCount[0]?.n ?? 0,
    newInquiries: newInquiries[0]?.n ?? 0,
    missingPhoto: missingPhoto[0]?.n ?? 0,
    missingFr: missingFr[0]?.n ?? 0,
    hidden: hiddenCount[0]?.n ?? 0,
    featured: featuredCount[0]?.n ?? 0,
    topCategories,
    latestInquiries,
    recentProducts,
  }
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

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const firstName = (session?.user?.name || '').split(' ')[0]

  const data = await getDashboardData()
  const hasWaitingInquiries = data.newInquiries > 0
  const maxCat = Math.max(1, ...data.topCategories.map((c) => c.n))

  const stats: Array<{
    label: string
    value: number
    href: string
    icon: typeof Package
    accent: StatAccent
    hint?: string
  }> = [
    {
      label: 'Produits en ligne',
      value: data.products,
      href: '/admin/products',
      icon: Package,
      accent: 'blue',
      hint: `${data.featured} mis en avant`,
    },
    {
      label: 'Marques',
      value: data.brands,
      href: '/admin/brands',
      icon: Tag,
      accent: 'violet',
      hint: 'partenaires distribués',
    },
    {
      label: 'Catégories',
      value: data.categories,
      href: '/admin/categories',
      icon: FolderKanban,
      accent: 'orange',
      hint: 'familles de produits',
    },
    {
      label: 'Demandes à traiter',
      value: data.newInquiries,
      href: '/admin/inquiries',
      icon: MessageSquare,
      accent: 'amber',
      hint: hasWaitingInquiries ? 'en attente de réponse' : 'tout est traité',
    },
  ]

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

  const actions = [
    {
      label: 'Nouveau produit',
      href: '/admin/products/new',
      icon: PackagePlus,
      color: 'var(--c-mint)',
    },
    {
      label: 'Importer un fichier',
      href: '/admin/products/import',
      icon: Upload,
      color: 'var(--c-blue)',
    },
    {
      label: 'Traiter les demandes',
      href: '/admin/inquiries',
      icon: MessageSquare,
      color: 'var(--c-amber)',
    },
    {
      label: 'Voir la boutique',
      href: '/',
      icon: ExternalLink,
      color: 'var(--c-violet)',
      external: true,
    },
  ]

  return (
    <div className="space-y-8">
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
            <p
              className="mt-2 max-w-[60ch] text-[15px]"
              style={{ color: 'var(--admin-text-secondary)' }}
            >
              {hasWaitingInquiries
                ? `${data.newInquiries} ${
                    data.newInquiries === 1 ? 'nouvelle demande attend' : 'nouvelles demandes attendent'
                  } une réponse. Le catalogue compte ${data.products} produits en ligne.`
                : `Le catalogue est à jour : ${data.products} produits en ligne, répartis en ${data.categories} catégories.`}
            </p>
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                {...(a.external
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
              live
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Left column — health + categories */}
        <div className="space-y-8">
          <section>
            <SectionTitle className="mb-5">Santé du site</SectionTitle>
            <GlassCard padded={false} className="overflow-hidden">
              {health.map((h, i) => (
                <Link
                  key={h.label}
                  href={h.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-white/[0.03]"
                  style={{
                    borderBottom:
                      i === health.length - 1
                        ? 'none'
                        : '1px solid var(--admin-line)',
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
                      style={{ background: 'color-mix(in oklab, var(--c-emerald) 12%, transparent)', color: 'var(--c-emerald-text)' }}
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
            <GlassCard className="space-y-4">
              {data.topCategories.map((c, i) => {
                const color = BAR_COLORS[i % BAR_COLORS.length]
                const w = Math.max(4, Math.round((c.n / maxCat) * 100))
                return (
                  <div key={c.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="truncate font-body text-[13px] font-medium text-white">
                        {c.nameFr ?? c.name}
                      </span>
                      <span
                        className="font-mono text-[12px]"
                        style={{ color }}
                      >
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
            <GlassCard padded={false} className="overflow-hidden">
              {data.latestInquiries.length === 0 ? (
                <div
                  className="px-6 py-10 text-center text-sm"
                  style={{ color: 'var(--admin-text-tertiary)' }}
                >
                  Aucune demande pour le moment.
                </div>
              ) : (
                <ul>
                  {data.latestInquiries.map((q, idx) => {
                    const st = INQUIRY_STATUS[q.status] ?? DEFAULT_STATUS
                    return (
                      <li
                        key={q.id}
                        style={{
                          borderBottom:
                            idx === data.latestInquiries.length - 1
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
            <GlassCard padded={false} className="overflow-hidden">
              <ul>
                {data.recentProducts.map((p, idx) => {
                  const tier = TIER_STYLES[p.tier as Tier]
                  return (
                    <li
                      key={p.id}
                      style={{
                        borderBottom:
                          idx === data.recentProducts.length - 1
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
            </GlassCard>
          </section>
        </div>
      </div>
    </div>
  )
}
