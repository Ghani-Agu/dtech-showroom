import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { Mail, Plus, Shield, ShoppingBag, UserPlus, Users as UsersIcon } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { GlassCard } from '@/components/admin/GlassCard'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { DeleteUserButton } from '@/components/admin/users/DeleteUserButton'
import { db } from '@/db/client'
import { subscribers, users } from '@/db/schema'
import { requireAdmin } from '@/lib/auth-helpers'
import { DEFAULT_STAFF_PERMISSIONS, SECTIONS } from '@/lib/permissions'

export const metadata: Metadata = {
  title: 'Utilisateurs · Dtech Admin',
  robots: { index: false, follow: false },
}

const AVATAR_COLORS = ['var(--c-mint)', 'var(--c-blue)', 'var(--c-violet)', 'var(--c-orange)', 'var(--c-rose)', 'var(--c-amber)']

function lastSeen(d: Date | null): string {
  if (!d) return 'Jamais connecté'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0) return "Connecté aujourd'hui"
  if (days === 1) return 'Connecté hier'
  return `Connecté il y a ${days} j`
}

function joinedOn(d: Date): string {
  return d.toLocaleDateString('fr-FR', { dateStyle: 'medium' })
}

export default async function UsersListPage() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/admin')
  }

  // LEFT JOIN on the newsletter list: a customer who opted in at sign-up
  // shows an « Abonné newsletter » chip — that's the campaign audience.
  const rows = await db
    .select({ user: users, newsletterStatus: subscribers.status })
    .from(users)
    .leftJoin(subscribers, eq(subscribers.email, users.email))
    .orderBy(asc(users.name))

  const team = rows.filter((r) => r.user.role !== 'customer')
  const customers = rows.filter((r) => r.user.role === 'customer')
  const admins = team.filter((r) => r.user.role === 'admin').length
  const staff = team.length - admins

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--admin-text-tertiary)]">
            Utilisateurs
          </p>
          <h1 className="font-display text-3xl tracking-tight text-white">
            Comptes du site<span className="text-[var(--admin-cyan)]">.</span>
          </h1>
          <p className="mt-2 font-body text-[13.5px]" style={{ color: 'var(--admin-text-secondary)' }}>
            {admins} admin{admins > 1 ? 's' : ''} · {staff} membre{staff > 1 ? 's' : ''} d&apos;équipe ·{' '}
            {customers.length} client{customers.length > 1 ? 's' : ''} — le site ne crée plus de comptes
            clients : les visiteurs s&apos;abonnent à la newsletter (pop-up + pied de page), gérée dans Abonnés.
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button variant="primary">
            <UserPlus size={16} />
            Créer un compte
          </Button>
        </Link>
      </div>

      {/* Team grid */}
      {team.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={UsersIcon}
            title="Aucun utilisateur."
            description="Créez le premier compte pour votre équipe."
            action={{ label: 'Créer un compte', href: '/admin/users/new' }}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {team.map(({ user: u }, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? 'var(--c-mint)'
            const isDeactivated = u.deactivatedAt !== null
            const isSelf = u.id === admin.id
            const isAdmin = u.role === 'admin'
            const perms = isAdmin
              ? SECTIONS.map((s) => s.key)
              : (u.permissions ?? DEFAULT_STAFF_PERMISSIONS)
            return (
              <div
                key={u.id}
                className={
                  'glass-surface flex flex-col gap-4 p-5 transition-[transform,border-color] duration-300 ease-[var(--admin-ease)] hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,_var(--c-mint)_30%,_transparent)]' +
                  (isDeactivated ? ' opacity-60' : '')
                }
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold"
                    style={{
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
                      color,
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-body text-[15.5px] font-bold text-white">
                        {u.name}
                      </p>
                      {isAdmin ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-body text-[10.5px] font-bold uppercase tracking-wide"
                          style={{ background: 'color-mix(in oklab, var(--c-mint) 14%, transparent)', color: 'var(--c-mint)' }}
                        >
                          <Shield size={10} />
                          Admin
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2 py-0.5 font-body text-[10.5px] font-bold uppercase tracking-wide"
                          style={{ background: 'color-mix(in oklab, var(--c-blue) 14%, transparent)', color: 'var(--c-blue)' }}
                        >
                          Équipe
                        </span>
                      )}
                      {isSelf && <Badge variant="neutral">Vous</Badge>}
                      {isDeactivated && <Badge variant="error">Désactivé</Badge>}
                    </div>
                    <p
                      className="mt-0.5 flex items-center gap-1.5 truncate font-body text-[12.5px]"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      <Mail size={11} />
                      {u.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                      {lastSeen(u.lastLoginAt)}
                    </p>
                  </div>
                </div>

                {/* permission chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {SECTIONS.filter((s) => s.key !== 'users' || isAdmin).map((s) => {
                    const on = perms.includes(s.key)
                    return (
                      <span
                        key={s.key}
                        className="rounded-full border px-2 py-0.5 font-body text-[10.5px] font-semibold"
                        style={
                          on
                            ? {
                                background: `color-mix(in oklab, ${s.color} 12%, transparent)`,
                                borderColor: `color-mix(in oklab, ${s.color} 40%, transparent)`,
                                color: s.color,
                              }
                            : {
                                borderColor: 'var(--admin-line)',
                                color: 'var(--admin-text-tertiary)',
                                textDecoration: 'line-through',
                                opacity: 0.6,
                              }
                        }
                      >
                        {s.label}
                      </span>
                    )
                  })}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
                  {!isSelf && <DeleteUserButton userId={u.id} userName={u.name} />}
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-body text-[12.5px] font-semibold transition-colors hover:border-[color-mix(in_oklab,_var(--c-mint)_50%,_transparent)] hover:text-white"
                    style={{
                      borderColor: 'var(--admin-glass-border-strong)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    Gérer le compte
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Customers (public sign-ups from the storefront) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <p className="inline-flex items-center gap-2 font-body text-[15px] font-bold text-white">
            <ShoppingBag size={15} style={{ color: 'var(--c-violet)' }} />
            Clients
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10.5px]"
              style={{ background: 'color-mix(in oklab, var(--c-violet) 14%, transparent)', color: 'var(--c-violet)' }}
            >
              {customers.length}
            </span>
          </p>
          <p className="mt-1 font-body text-[12.5px]" style={{ color: 'var(--admin-text-tertiary)' }}>
            Comptes visiteurs résiduels (rôle « client » — aucun accès à cet espace).
            L&apos;inscription publique est désactivée ; supprimez-les librement.
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={ShoppingBag}
            title="Aucun compte client — c'est normal."
            description="Les visiteurs s'abonnent à la newsletter via le pop-up du site ; retrouvez-les dans Abonnés. L'inscription publique de comptes est désactivée."
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map(({ user: u, newsletterStatus }) => {
            const isSubscribed = newsletterStatus === 'subscribed'
            return (
              <div key={u.id} className="glass-surface flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold"
                    style={{
                      background: 'color-mix(in oklab, var(--c-violet) 13%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--c-violet) 38%, transparent)',
                      color: 'var(--c-violet)',
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-body text-[14.5px] font-bold text-white">{u.name}</p>
                      <span
                        className="rounded-full px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: 'color-mix(in oklab, var(--c-violet) 14%, transparent)', color: 'var(--c-violet)' }}
                      >
                        Client
                      </span>
                    </div>
                    <p
                      className="mt-0.5 flex items-center gap-1.5 truncate font-body text-[12px]"
                      style={{ color: 'var(--admin-text-secondary)' }}
                    >
                      <Mail size={11} />
                      {u.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                      Inscrit le {joinedOn(u.createdAt)} · {lastSeen(u.lastLoginAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {isSubscribed ? (
                    <span
                      className="rounded-full border px-2 py-0.5 font-body text-[10.5px] font-semibold"
                      style={{
                        background: 'color-mix(in oklab, var(--c-mint) 11%, transparent)',
                        borderColor: 'color-mix(in oklab, var(--c-mint) 38%, transparent)',
                        color: 'var(--c-mint)',
                      }}
                    >
                      Abonné newsletter
                    </span>
                  ) : (
                    <span
                      className="rounded-full border px-2 py-0.5 font-body text-[10.5px] font-semibold"
                      style={{ borderColor: 'var(--admin-line)', color: 'var(--admin-text-tertiary)' }}
                    >
                      Sans newsletter
                    </span>
                  )}
                  <DeleteUserButton userId={u.id} userName={u.name} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Google note */}
      <GlassCard className="flex items-start gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'color-mix(in oklab, var(--c-blue) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--c-blue) 35%, transparent)', color: 'var(--c-blue)' }}
        >
          <Plus size={16} />
        </span>
        <div>
          <p className="font-body text-[14px] font-semibold text-white">
            Connexion Google automatique
          </p>
          <p className="mt-1 font-body text-[12.5px] leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
            Si le compte est créé avec une adresse Gmail, l&apos;employé peut aussi
            se connecter via « Continuer avec Google » — les deux méthodes mènent
            au même compte, avec les mêmes accès. Un visiteur qui s&apos;inscrit
            avec Google depuis le site devient automatiquement un compte client.
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
