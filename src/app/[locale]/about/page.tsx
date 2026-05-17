import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about')
  return {
    title: t('pageTitle'),
    description: t('introduction'),
  }
}

export default async function AboutPage() {
  const t = await getTranslations('about')
  const tNav = await getTranslations('navigation')

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-16">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tNav('about') },
            ]}
          />

          <div className="max-w-3xl space-y-6">
            <EyebrowLabel>{tNav('about').toUpperCase()}</EyebrowLabel>
            <Heading as="h1" size="hero" accentChar=".">
              {t('heading')}
            </Heading>
            <p className="font-mono text-sm uppercase tracking-wider text-text-muted">
              {t('establishedSince')}
            </p>
          </div>

          <div className="max-w-3xl space-y-6 font-body text-lg leading-relaxed text-text-secondary">
            <p>{t('introduction')}</p>
            <div className="space-y-2">
              <Heading as="h2" size="md">
                {t('approach')}
              </Heading>
              <p>{t('approachBody')}</p>
            </div>
          </div>

          <div
            id="contact"
            className="grid grid-cols-1 gap-12 border-t border-surface-elevated pt-12 md:grid-cols-2"
          >
            <div className="space-y-4">
              <EyebrowLabel>{t('contact').toUpperCase()}</EyebrowLabel>
              <Heading as="h2" size="md">
                {t('contact')}
              </Heading>
              <p className="font-body text-base text-text-secondary">
                {t('contactBody')}
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
