'use client'

/**
 * Le corps de la page « Mentions légales », sorti de sa route.
 *
 * POURQUOI : ce texte doit s'afficher à DEUX endroits — la vraie route
 * /legal et l'aperçu de l'éditeur, qui l'injecte dans `ctx.slots.body` de la
 * section `slot.legal`. Tant que le balisage vivait dans le fichier de route,
 * l'aperçu ne pouvait que le réécrire de mémoire : deux copies qui divergent
 * au premier ajout de paragraphe, et un auteur qui met en page une chose
 * différente de ce que verra le visiteur.
 *
 * Le balisage est repris TEL QUEL (mêmes classes, mêmes clés i18n `legal.*`,
 * même ordre de sections) : l'extraction ne doit rien changer au rendu.
 *
 * Composant client parce qu'il est monté depuis un module serveur ET depuis
 * une page serveur : `useTranslations` fonctionne dans les deux cas dès que le
 * `NextIntlClientProvider` de l'arbre est en place, là où `getTranslations`
 * n'aurait servi que la route.
 */

import { useTranslations } from 'next-intl'
import { Container } from '@/components/ui/Container'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { Heading } from '@/components/ui/Heading'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { EditProvider, Editable, type EditData } from '@/components/site-edit/edit-context'

export function EdLegalBody({ content }: { content?: Partial<EditData> }) {
  const t = useTranslations('legal')
  const tNav = useTranslations('navigation')

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
