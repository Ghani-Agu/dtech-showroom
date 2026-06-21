import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getPublishedPage, getPublishedContent } from '@/server/editor-page-data'
import { PublishedPage } from '@/components/admin/editor/PublishedPage'
import { EditProvider, Editable } from '@/components/site-edit/edit-context'
import type { PageDoc } from '@/components/admin/editor/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about')
  return {
    title: t('pageTitle'),
    description: t('introduction'),
  }
}

export default async function AboutPage() {
  const tmpl = await getPublishedPage('page:about')
  if (tmpl) return <PublishedPage doc={tmpl as unknown as PageDoc} />

  const t = await getTranslations('about')
  const tNav = await getTranslations('navigation')
  const content = await getPublishedContent('page:about')

  return (
    <EditProvider initial={content}>
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
              <EyebrowLabel>
                <Editable id="about.eyebrow" label="Sur-titre">{tNav('about').toUpperCase()}</Editable>
              </EyebrowLabel>
              <Heading as="h1" size="hero" accentChar=".">
                <Editable id="about.heading" label="Titre">{t('heading')}</Editable>
              </Heading>
              <p className="font-mono text-sm uppercase tracking-wider text-text-muted">
                <Editable id="about.established" label="Depuis">{t('establishedSince')}</Editable>
              </p>
            </div>

            <div className="max-w-3xl space-y-6 font-body text-lg leading-relaxed text-text-secondary">
              <Editable as="p" id="about.intro" label="Introduction">{t('introduction')}</Editable>
              <div className="space-y-2">
                <Heading as="h2" size="md">
                  <Editable id="about.approachTitle" label="Titre — Approche">{t('approach')}</Editable>
                </Heading>
                <Editable as="p" id="about.approachBody" label="Texte — Approche">{t('approachBody')}</Editable>
              </div>
            </div>

            <div
              id="contact"
              className="grid grid-cols-1 gap-12 border-t border-surface-elevated pt-12 md:grid-cols-2"
            >
              <div className="space-y-4">
                <EyebrowLabel>
                  <Editable id="about.contactEyebrow" label="Sur-titre — Contact">{t('contact').toUpperCase()}</Editable>
                </EyebrowLabel>
                <Heading as="h2" size="md">
                  <Editable id="about.contactTitle" label="Titre — Contact">{t('contact')}</Editable>
                </Heading>
                <p className="font-body text-base text-text-secondary">
                  <Editable id="about.contactBody" label="Texte — Contact">{t('contactBody')}</Editable>
                </p>
              </div>
              <div className="space-y-2 font-body text-base text-text-secondary">
                <Editable as="p" id="about.email" label="E-mail">contact@d-techalgerie.com</Editable>
                <Editable as="p" id="about.phone" label="Téléphone">+213 0 00 00 00 00</Editable>
                <p>
                  <Editable id="about.addr" label="Adresse">Dtech Algérie — Alger, Algeria</Editable>
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </EditProvider>
  )
}
