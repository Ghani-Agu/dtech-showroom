import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export const metadata: Metadata = {
  title: 'About',
  description: 'About Dtech Algérie — distributor since 2006.',
}

export default function AboutPage() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-16">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

          <div className="max-w-3xl space-y-6">
            <EyebrowLabel>ABOUT</EyebrowLabel>
            <Heading as="h1" size="hero" accentChar=".">
              Dtech Algérie
            </Heading>
          </div>

          <div className="max-w-3xl space-y-6 font-body text-lg leading-relaxed text-text-secondary">
            <p>
              Dtech Algérie has been distributing computer and networking hardware
              since 2006. The catalog covers HP, Dell, ASUS, TP-Link, and the in-house
              D-Tech line of cables, drives, and peripherals.
            </p>
            <p>
              This site is the showroom. Not a storefront, not a checkout, not a
              comparison engine. A place to browse what Dtech carries with the
              materiality the products deserve, and to start a conversation when a
              specific machine fits the requirement.
            </p>
            <p>
              Every product in the catalog is presented with three things in mind:
              the spec that matters, the photography that explains the object, and
              the inquiry form that turns interest into a quote.
            </p>
            <p>
              The catalog is curated, not exhaustive. If a product Dtech distributes
              isn&apos;t shown here, that is intentional. We focus the showroom on
              the lines we want to talk about.
            </p>
          </div>

          <div id="contact" className="grid grid-cols-1 gap-12 border-t border-surface-elevated pt-12 md:grid-cols-2">
            <div className="space-y-4">
              <EyebrowLabel>CONTACT</EyebrowLabel>
              <Heading as="h2" size="md">
                Talk to us
              </Heading>
              <p className="font-body text-base text-text-secondary">
                The fastest path is the inquiry form on any product page. Otherwise
                email or phone work.
              </p>
            </div>
            <div className="space-y-2 font-body text-base text-text-secondary">
              <p>contact@d-techalgerie.com</p>
              <p>+213 0 00 00 00 00</p>
              <p>
                Dtech Algérie
                <br />
                Alger, Algeria
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
