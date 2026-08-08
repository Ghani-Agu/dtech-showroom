'use client'

/**
 * Le corps de la page « introuvable » (404), sorti de sa route.
 *
 * Même raison que pour EdLegalBody : l'éditeur propose une page `notfound`,
 * et sa section `slot.notfound` doit montrer le VRAI contenu 404, pas une
 * imitation. Extraire plutôt que recopier, c'est garantir qu'un changement de
 * texte ou de classe se voit des deux côtés du même coup.
 *
 * Le balisage est repris tel quel (mêmes classes, mêmes clés `notFound.*`) ;
 * seule l'enveloppe de peau (`SkinShell`) reste dans la route, parce que
 * l'aperçu, lui, a déjà la sienne (`EdSkinPage`).
 */

import { useTranslations } from 'next-intl'
import { InquiryButton } from '@/components/ui/InquiryButton'

export function EdNotFoundBody() {
  const t = useTranslations('notFound')

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface-base px-8 py-16">
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="font-display text-7xl font-medium leading-tight tracking-tight text-text-primary">
          404<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-xl text-text-secondary">
          {t('heading')}
        </p>
        <p className="font-body text-base text-text-muted">
          {t('description')}
        </p>
        <div className="flex justify-center pt-4">
          <InquiryButton href="/">{t('action')}</InquiryButton>
        </div>
      </div>
    </div>
  )
}
