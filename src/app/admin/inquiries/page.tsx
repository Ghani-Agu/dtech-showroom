import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getAllInquiries } from '@/server/queries'

// TODO: Phase 2+ — gate behind better-auth admin session
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin · Inquiries',
  description: 'All inquiries received via the Dtech showroom.',
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

export default async function AdminInquiriesPage() {
  const inquiryList = await getAllInquiries()

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-12">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Admin', href: '/admin' },
              { label: 'Inquiries' },
            ]}
          />
          <div className="space-y-2">
            <EyebrowLabel>ADMIN · {inquiryList.length} INQUIRIES</EyebrowLabel>
            <Heading as="h1" size="lg" accentChar=".">
              Inquiries
            </Heading>
          </div>

          {inquiryList.length === 0 ? (
            <EmptyState message="No inquiries have come in yet." />
          ) : (
            <div className="space-y-4">
              {inquiryList.map((inquiry) => (
                <Card key={inquiry.id} padding="md">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr_auto]">
                    <div className="space-y-1">
                      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                        {formatDate(inquiry.submittedAt)}
                      </p>
                      <p className="font-mono text-xs uppercase tracking-wider text-accent">
                        {inquiry.status}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-body text-base text-text-primary">
                        {inquiry.fullName}
                        {inquiry.company ? (
                          <span className="text-text-muted"> · {inquiry.company}</span>
                        ) : null}
                      </p>
                      <p className="font-mono text-xs text-text-secondary">
                        {inquiry.email} · {inquiry.phone}
                      </p>
                      <p className="font-body text-sm text-text-secondary">
                        {inquiry.productBrand} · {inquiry.productName}
                        <span className="font-mono text-text-muted">
                          {' '}
                          ({inquiry.productSlug})
                        </span>
                      </p>
                      <p className="font-body text-base text-text-primary whitespace-pre-wrap">
                        {inquiry.message}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
