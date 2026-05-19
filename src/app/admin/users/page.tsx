import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { Plus, Users as UsersIcon } from 'lucide-react'
import {
  Avatar,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Pill,
} from '@/components/admin-v2/ui'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Team · Dtech Admin',
  robots: { index: false, follow: false },
}

type UserRow = {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  deactivatedAt: Date | null
  lastLoginAt: Date | null
}

export default async function UsersListPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/admin')
  }

  const rows = (await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deactivatedAt: users.deactivatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt))) as UserRow[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`${rows.length} ${rows.length === 1 ? 'admin user' : 'admin users'} with access to this dashboard.`}
        action={
          <Link href="/admin/users/new">
            <Button variant="primary">
              <Plus size={14} />
              Add user
            </Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="bg-admin-surface-raised border border-admin-border rounded-2xl">
          <EmptyState
            icon={UsersIcon}
            title="No users yet."
            description="Invite the team. New users receive a password reset email to set their own password."
            action={{ label: 'Add user', href: '/admin/users/new' }}
          />
        </div>
      ) : (
        <DataTable<UserRow>
          rows={rows}
          rowKey={(u) => u.id}
          rowHref={(u) => `/admin/users/${u.id}/edit`}
          columns={[
            {
              key: 'avatar',
              header: '',
              width: '60px',
              render: (u) => <Avatar name={u.name} size="md" />,
            },
            {
              key: 'name',
              header: 'Name',
              render: (u) => (
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-admin-text-primary truncate">
                    {u.name}
                  </p>
                  <p className="font-body text-xs text-admin-text-muted truncate mt-0.5">
                    {u.email}
                  </p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (u) => (
                <Pill
                  variant={u.role === 'admin' ? 'accent' : 'default'}
                  withDot={false}
                >
                  {u.role}
                </Pill>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (u) =>
                u.deactivatedAt ? (
                  <Pill variant="error">Deactivated</Pill>
                ) : (
                  <Pill variant="success">Active</Pill>
                ),
            },
            {
              key: 'lastLogin',
              header: 'Last login',
              align: 'right',
              render: (u) => (
                <span className="font-mono text-xs text-admin-text-muted">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString()
                    : '—'}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
