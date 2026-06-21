import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { and, asc, count, eq, isNotNull, isNull } from 'drizzle-orm'
import {
  ExternalLink,
  FolderOpen,
  Package,
  Pencil,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { GlassCard } from '@/components/admin/GlassCard'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { db } from '@/db/client'
import { categories, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Catégories · Dtech Admin',
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
  'var(--c-mint)',
  'var(--c-blue)',
  'var(--c-violet)',
  'var(--c-orange)',
  'var(--c-rose)',
  'var(--c-amber)',
]

export default async function CategoriesListPage({ searchParams }: PageProps) {
  const params = await searchParams
  const state = validateState(params.state)

  const whereClause =
    state === 'active'
      ? isNull(categories.archivedAt)
      : state === 'archived'
        ? isNotNull(categories.archivedAt)
        : undefined

  const [rows, activeCount, archivedCount] = await Promise.all([
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        nameFr: categories.nameFr,
        heroImagePath: categories.heroImagePath,
        sortOrder: categories.sortOrder,
        archivedAt: categories.archivedAt,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(eq(products.categoryId, categories.id), isNull(products.archivedAt))
      )
      .where(whereClause)
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ n: count() }).from(categories).where(isNull(categories.archivedAt)),
    db.select({ n: count() }).from(categories).where(isNotNull(categories.archivedAt)),
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
            Catégories
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            Familles de produits<span className="text-[var(--admin-cyan)]">.</span>
          </h1>
          <p
            className="mt-2 font-body text-[13.5px]"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {rows.length} catégorie{rows.length > 1 ? 's' : ''} ·{' '}
            {totalProducts} produit{totalProducts > 1 ? 's' : ''} répartis —
            chaque carte renvoie vers sa page sur le site.
          </p>
        </div>
        <Link href="/admin/categories/new">
          <Button variant="primary">
            <Plus size={16} />
            Nouvelle catégorie
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
            f.value === 'active'
              ? '/admin/categories'
              : `/admin/categories?state=${f.value}`
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
            icon={FolderOpen}
            title={
              state === 'archived'
                ? 'Aucune catégorie masquée.'
                : 'Aucune catégorie pour le moment.'
            }
            description="Les catégories regroupent les produits par usage sur le site."
            action={{
              label: 'Ajouter une catégorie',
              href: '/admin/categories/new',
            }}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length] ?? 'var(--c-mint)'
            const isArchived = c.archivedAt !== null
            const hasFr = !!c.nameFr
            const displayName = c.nameFr ?? c.name
            return (
              <div
                key={c.id}
                className={
                  'glass-surface group relative flex flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-300 ease-[var(--admin-ease)] hover:-translate-y-1' +
                  (isArchived ? ' opacity-70' : '')
                }
                style={{
                  ['--card-glow' as string]: `color-mix(in oklab, ${color} 40%, transparent)`,
                  boxShadow: 'none',
                }}
              >
                {/* Image header — clickable to edit */}
                <Link
                  href={`/admin/categories/${c.id}/edit`}
                  className="relative block h-32 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)]"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklab, ${color} 16%, #0a1310), #0a1310)`,
                  }}
                >
                  {c.heroImagePath && (
                    <Image
                      src={c.heroImagePath}
                      alt=""
                      fill
                      sizes="400px"
                      className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-16"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent, var(--admin-overlay))',
                    }}
                  />
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
                    {c.productCount}
                  </span>
                  {/* name overlay */}
                  <span className="absolute bottom-3 left-4 right-4">
                    <span className="block truncate font-body text-[16.5px] font-bold text-white">
                      {displayName}
                    </span>
                    <span
                      className="block truncate font-mono text-[10.5px]"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      /{c.slug}
                    </span>
                  </span>
                </Link>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold"
                      style={{
                        background: `color-mix(in oklab, ${color} 13%, transparent)`,
                        color,
                      }}
                    >
                      {c.productCount} produit{c.productCount > 1 ? 's' : ''} en ligne
                    </span>
                    {!hasFr && <Badge variant="warning">EN uniquement</Badge>}
                    {isArchived && <Badge variant="neutral">Masquée</Badge>}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/admin/categories/${c.id}/edit`}
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
                      href={`/fr/categories/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Voir sur le site"
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
