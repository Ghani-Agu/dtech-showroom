import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'

export const metadata: Metadata = {
  title: 'Categories — Dtech Admin',
  robots: { index: false, follow: false },
}

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Categories
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Category taxonomy<span className="text-accent">.</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 7e</CardTitle>
          <CardDescription>
            Category management — slugs, hero imagery, ordering, and product
            assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-text-secondary">
            Category management arrives in Phase 7e alongside brand and user
            administration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
