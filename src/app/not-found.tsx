import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { InquiryButton } from '@/components/ui/InquiryButton'

export default function NotFound() {
  return (
    <section className="py-24 md:py-40">
      <Container>
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Heading
            as="h1"
            size="hero"
            accentChar="."
            className="text-center"
          >
            404
          </Heading>
          <p className="font-body text-xl text-text-secondary">
            This page isn&apos;t in the catalog.
          </p>
          <div className="flex justify-center pt-4">
            <InquiryButton href="/">Return to the floor</InquiryButton>
          </div>
        </div>
      </Container>
    </section>
  )
}
