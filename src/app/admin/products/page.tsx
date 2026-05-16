import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'

export const metadata: Metadata = {
  title: 'Products — Dtech Admin',
  robots: { index: false, follow: false },
}

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
          Products
        </p>
        <h1 className="font-display text-3xl tracking-tight text-text-primary">
          Product catalog<span className="text-accent">.</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 7c</CardTitle>
          <CardDescription>
            Full product CRUD — create, edit, delete, tier assignment, and
            bilingual content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-text-secondary">
            Product management arrives in Phase 7c. Image upload via Cloudflare
            R2 follows in Phase 7d.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
