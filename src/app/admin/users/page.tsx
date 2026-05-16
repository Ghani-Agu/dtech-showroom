import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'

export const metadata: Metadata = {
  title: 'Users — Dtech Admin',
  robots: { index: false, follow: false },
}

export default function UsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Users
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Operator accounts<span className="text-accent">.</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 7e</CardTitle>
          <CardDescription>
            User management — invite operators, assign roles (admin/staff), and
            reset credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-text-secondary">
            User management arrives in Phase 7e. This page is only visible to
            users with the admin role.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
