import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('pageTitle'),
    description: t('mentionsBody'),
  }
}

export default async function LegalPage() {
  const t = await getTranslations('legal')
  const tNav = await getTranslations('navigation')

  const sections = [
    { id: 'mentions', title: t('mentionsTitle'), body: t('mentionsBody') },
    { id: 'cgv', title: t('cgvTitle'), body: t('cgvBody') },
    { id: 'privacy', title: t('privacyTitle'), body: t('privacyBody') },
  ]

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="space-y-16">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: t('pageTitle') },
            ]}
          />

          <div className="max-w-3xl space-y-6">
            <EyebrowLabel>{t('pageTitle').toUpperCase()}</EyebrowLabel>
            <Heading as="h1" size="hero" accentChar=".">
              {t('heading')}
            </Heading>
            <p className="font-mono text-sm uppercase tracking-wider text-text-muted">
              {t('updated')}
            </p>
          </div>

          <div className="max-w-3xl space-y-12 font-body text-lg leading-relaxed text-text-secondary">
            {sections.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
                <Heading as="h2" size="md">
                  {s.title}
                </Heading>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
