import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { and, asc, count, eq, isNotNull, isNull } from 'drizzle-orm'
import { ExternalLink, Package, Pencil, Plus, Tag } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { GlassCard } from '@/components/admin/GlassCard'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { db } from '@/db/client'
import { brands, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Marques · Dtech Admin',
  robots: { index: false, follow: false },
}

type StateFilter = 'active' | 'archived' | 'all'

interface PageProps {
  searchParams: Promise<{ state?: StateFilter }>
}

function validateState(s?: string): StateFilter {
  return s === 'archived' || s === 'all' ? s : 'active'
}

const CARD_COLORS = [
  'var(--c-violet)',
  'var(--c-blue)',
  'var(--c-mint)',
  'var(--c-orange)',
  'var(--c-rose)',
  'var(--c-amber)',
]

export default async function BrandsListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)

  const whereClause =
    state === 'active'
      ? isNull(brands.archivedAt)
      : state === 'archived'
        ? isNotNull(brands.archivedAt)
        : undefined

  const [rows, activeCount, archivedCount] = await Promise.all([
    db
      .select({
        id: brands.id,
        slug: brands.slug,
        name: brands.name,
        nameFr: brands.nameFr,
        statement: brands.statement,
        statementFr: brands.statementFr,
        heroImagePath: brands.heroImagePath,
        logoPath: brands.logoPath,
        archivedAt: brands.archivedAt,
        productCount: count(products.id),
      })
      .from(brands)
      .leftJoin(
        products,
        and(eq(products.brandId, brands.id), isNull(products.archivedAt))
      )
      .where(whereClause)
      .groupBy(brands.id)
      .orderBy(asc(brands.sortOrder), asc(brands.name)),
    db.select({ n: count() }).from(brands).where(isNull(brands.archivedAt)),
    db.select({ n: count() }).from(brands).where(isNotNull(brands.archivedAt)),
  ])

  const totalProducts = rows.reduce((a, r) => a + r.productCount, 0)

  const filters: Array<{ value: StateFilter; label: string; n?: number }> = [
    { value: 'active', label: 'Actives', n: activeCount[0]?.n ?? 0 },
    { value: 'archived', label: 'Masquées', n: archivedCount[0]?.n ?? 0 },
    { value: 'all', label: 'Toutes' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Marques
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            Partenaires distribués<span className="text-[var(--admin-cyan)]">.</span>
          </h1>
          <p
            className="mt-2 font-body text-[13.5px]"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {rows.length} marque{rows.length > 1 ? 's' : ''} · {totalProducts}{' '}
            produit{totalProducts > 1 ? 's' : ''} au total — chaque carte renvoie
            vers sa page sur le site.
          </p>
        </div>
        <Link href="/admin/brands/new">
          <Button variant="primary">
            <Plus size={16} />
            Nouvelle marque
          </Button>
        </Link>
      </div>

      {/* State filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
          État :
        </span>
        {filters.map((f) => {
          const isActive = state === f.value
          const href =
            f.value === 'active' ? '/admin/brands' : `/admin/brands?state=${f.value}`
          return (
            <Link
              key={f.value}
              href={href}
              className={
                isActive
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-cyan)]/15 border border-[color-mix(in_oklab,_var(--c-mint)_35%,_transparent)] px-3 py-1 font-body text-xs font-semibold text-[var(--admin-cyan)]'
                  : 'inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3 py-1 font-body text-xs text-[var(--admin-text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-white'
              }
            >
              {f.label}
              {typeof f.n === 'number' && (
                <span className="font-mono text-[10px] opacity-75">{f.n}</span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Tag}
            title={
              state === 'archived'
                ? 'Aucune marque masquée.'
                : 'Aucune marque pour le moment.'
            }
            description="Les marques regroupent les produits par fabricant sur le site."
            action={{ label: 'Ajouter une marque', href: '/admin/brands/new' }}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((b, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length] ?? 'var(--c-violet)'
            const isArchived = b.archivedAt !== null
            const hasFr = !!b.nameFr || !!b.statementFr
            const statement = b.statementFr ?? b.statement
            return (
              <div
                key={b.id}
                className={
                  'glass-surface group relative flex flex-col overflow-hidden transition-[transform,box-shadow] duration-300 ease-[var(--admin-ease)] hover:-translate-y-1' +
                  (isArchived ? ' opacity-70' : '')
                }
              >
                {/* Header — hero image + logo block, clickable to edit */}
                <Link
                  href={`/admin/brands/${b.id}/edit`}
                  className="relative block h-28 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
                  style={{
                    background: `linear-gradient(120deg, color-mix(in oklab, ${color} 18%, #0a1310), #0a1310 70%)`,
                  }}
                >
                  {b.heroImagePath && (
                    <Image
                      src={b.heroImagePath}
                      alt=""
                      fill
                      sizes="400px"
                      className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-14"
                    style={{
                      background: 'linear-gradient(180deg, transparent, var(--admin-overlay))',
                    }}
                  />
                  {/* logo tile */}
                  <span
                    className="absolute left-4 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur"
                    style={{
                      background: 'var(--admin-overlay)',
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                    }}
                  >
                    {b.logoPath ? (
                      <Image
                        src={b.logoPath}
                        alt=""
                        width={48}
                        height={48}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <span
                        className="font-display text-xl font-bold"
                        style={{ color }}
                      >
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  {/* count chip */}
                  <span
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold backdrop-blur"
                    style={{
                      background: 'var(--admin-overlay)',
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                      color,
                    }}
                  >
                    <Package size={11} />
                    {b.productCount}
                  </span>
                  {/* name */}
                  <span className="absolute bottom-3 left-[84px] right-4">
                    <span className="block truncate font-body text-[17px] font-bold text-white">
                      {b.nameFr ?? b.name}
                    </span>
                    <span
                      className="block truncate font-mono text-[10.5px]"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      /{b.slug}
                    </span>
                  </span>
                </Link>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <p
                    className="line-clamp-2 font-body text-[12.5px] leading-relaxed"
                    style={{ color: 'var(--admin-text-secondary)' }}
                  >
                    {statement}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold"
                      style={{
                        background: `color-mix(in oklab, ${color} 13%, transparent)`,
                        color,
                      }}
                    >
                      {b.productCount} produit{b.productCount > 1 ? 's' : ''} en ligne
                    </span>
                    {!hasFr && <Badge variant="warning">EN uniquement</Badge>}
                    {isArchived && <Badge variant="neutral">Masquée</Badge>}
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/admin/brands/${b.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border py-1.5 font-body text-[12.5px] font-semibold transition-colors hover:border-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)] hover:text-white"
                      style={{
                        borderColor: 'var(--admin-glass-border-strong)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      <Pencil size={12} />
                      Modifier
                    </Link>
                    <a
                      href={`/fr/brands/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border py-1.5 font-body text-[12.5px] font-semibold transition-colors hover:brightness-110"
                      style={{
                        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
                        background: `color-mix(in oklab, ${color} 10%, transparent)`,
                        color,
                      }}
                    >
                      <ExternalLink size={12} />
                      Voir sur le site
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
