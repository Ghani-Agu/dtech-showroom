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
  const t = await getTranslations('legal')
  return {
    title: t('pageTitle'),
    description: t('mentionsBody'),
  }
}

export default async function LegalPage() {
  const tmpl = await getPublishedPage('page:legal')
  if (tmpl) return <PublishedPage doc={tmpl as unknown as PageDoc} />

  const t = await getTranslations('legal')
  const tNav = await getTranslations('navigation')
  const content = await getPublishedContent('page:legal')

  const sections = [
    { id: 'mentions', title: t('mentionsTitle'), body: t('mentionsBody') },
    { id: 'cgv', title: t('cgvTitle'), body: t('cgvBody') },
    { id: 'privacy', title: t('privacyTitle'), body: t('privacyBody') },
  ]

  return (
    <EditProvider initial={content}>
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
              <EyebrowLabel>
                <Editable id="legal.eyebrow" label="Sur-titre">{t('pageTitle').toUpperCase()}</Editable>
              </EyebrowLabel>
              <Heading as="h1" size="hero" accentChar=".">
                <Editable id="legal.heading" label="Titre">{t('heading')}</Editable>
              </Heading>
              <p className="font-mono text-sm uppercase tracking-wider text-text-muted">
                <Editable id="legal.updated" label="Mise à jour">{t('updated')}</Editable>
              </p>
            </div>

            <div className="max-w-3xl space-y-12 font-body text-lg leading-relaxed text-text-secondary">
              {sections.map((s) => (
                <div key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
                  <Heading as="h2" size="md">
                    <Editable id={`legal.${s.id}.title`} label="Titre de section">{s.title}</Editable>
                  </Heading>
                  <Editable as="p" id={`legal.${s.id}.body`} label="Texte de section">{s.body}</Editable>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </EditProvider>
  )
}
