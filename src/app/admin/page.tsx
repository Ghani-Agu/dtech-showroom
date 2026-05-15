import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Dtech admin — coming in a later phase.',
}

export default function AdminPage() {
  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <EyebrowLabel className="text-center">ADMIN</EyebrowLabel>
          <Heading as="h1" size="lg" accentChar=".">
            Admin coming in Phase 2+
          </Heading>
          <p className="font-body text-lg text-text-secondary">
            Authentication, dashboards, and the inquiry queue arrive in a later phase.
            For now, a read-only inquiries list is available.
          </p>
          <div className="pt-4">
            <Link
              href="/admin/inquiries"
              className="group inline-flex items-baseline gap-2 font-body text-base text-text-primary"
            >
              <span className="border-b border-text-muted pb-0.5 transition-colors group-hover:border-accent">
                View inquiries
              </span>
              <span aria-hidden="true" className="text-accent">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
