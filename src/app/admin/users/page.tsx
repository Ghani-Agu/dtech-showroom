import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { CircleDashed, Plus } from 'lucide-react'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Users — Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function UsersListPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/admin')
  }

  const rows = await db.select().from(users).orderBy(asc(users.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Users
          </p>
          <h1 className="font-display text-3xl tracking-tight text-text-primary">
            Users<span className="text-accent">.</span>
          </h1>
        </div>
        <Link href="/admin/users/new">
          <Button variant="primary">
            <Plus size={16} />
            New user
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <CircleDashed
              size={40}
              className="mx-auto mb-4 text-text-muted"
            />
            <p className="font-body text-base text-text-secondary">
              No users yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-surface-overlay">
            {rows.map((user) => {
              const isDeactivated = user.deactivatedAt !== null
              return (
                <li key={user.id}>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className={
                      isDeactivated
                        ? 'block px-6 py-4 opacity-60 transition-colors hover:bg-surface-overlay/40'
                        : 'block px-6 py-4 transition-colors hover:bg-surface-overlay/40'
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-elevated font-mono text-sm uppercase text-text-secondary">
                        {user.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-body text-base font-medium text-text-primary">
                            {user.name}
                          </p>
                          <Badge
                            variant={
                              user.role === 'admin' ? 'accent' : 'neutral'
                            }
                          >
                            {user.role}
                          </Badge>
                          {isDeactivated && (
                            <Badge variant="error">Deactivated</Badge>
                          )}
                        </div>
                        <p className="mt-1 font-body text-sm text-text-secondary">
                          {user.email}
                        </p>
                      </div>
                      {user.lastLoginAt && (
                        <div className="flex-shrink-0 text-right">
                          <p className="font-mono text-xs text-text-muted">
                            Last login
                          </p>
                          <p className="font-body text-xs text-text-secondary">
                            {new Date(
                              user.lastLoginAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
