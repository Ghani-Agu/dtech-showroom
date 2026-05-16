import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'

export const metadata: Metadata = {
  title: 'Brands — Dtech Admin',
  robots: { index: false, follow: false },
}

export default function BrandsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Brands
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Brand directory<span className="text-accent">.</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 7e</CardTitle>
          <CardDescription>
            Brand management — logos, hero imagery, descriptions, and product
            assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-text-secondary">
            Brand management arrives in Phase 7e alongside category and user
            administration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
