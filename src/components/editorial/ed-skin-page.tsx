'use client'

/**
 * ÉDITEUR — l'enveloppe commune à toutes les pages de la peau Éditorial.
 *
 * Une seule enveloppe pour les douze pages : fournisseur de contexte, en-tête,
 * `<main>`, pied de page, tiroir panier. C'est ce composant que rend le site
 * public ET l'aperçu de l'éditeur — d'où la garantie que l'un ressemble à
 * l'autre : c'est le même.
 *
 * L'accueil garde sa particularité d'origine (pas de classe `ed-main`, et un
 * en-tête qui précharge les visuels du hero), simplement parce que c'est ce
 * que faisait `EditorialHome`.
 */

import type { ReactNode } from 'react'
import { EditorialProvider } from './editorial-context'
import { EditorialHeader, EditorialFooter } from './EditorialChrome'
import { CartDrawer } from '@/components/showroom/CartDrawer'
import { FloatingCart } from '@/components/showroom/FloatingCart'
import { EdPage } from './ed-page'
import type { EdPageData } from './ed-ctx'
import type { EdDoc, EdSite, EdText } from '@/lib/ed-editor/model'

export interface EdSkinPageProps {
  locale: string
  pageKey: string
  doc: EdDoc
  site?: EdSite | null
  data?: EdPageData
  slots?: Record<string, ReactNode>
  editing?: boolean
  /** Visuels préchargés par l'en-tête (accueil uniquement). */
  previews?: (string | null)[]
  /** Familles listées dans le pied de page (accueil uniquement). */
  catNames?: { id: string; name: string }[]
}

export function EdSkinPage({
  locale,
  pageKey,
  doc,
  site,
  data,
  slots,
  editing = false,
  previews,
  catNames,
}: EdSkinPageProps) {
  const isHome = pageKey === 'home'
  /* Les textes de la page l'emportent sur ceux du site (menu, pied de page),
     eux-mêmes prioritaires sur la traduction d'origine. */
  const text: Record<string, EdText> = { ...(site?.text ?? {}), ...(doc.text ?? {}) }

  return (
    <EditorialProvider locale={locale} text={text}>
      {site?.header?.hidden ? null : <EditorialHeader previews={previews} />}
      <main id="main-content" className={isHome ? undefined : 'ed-main'}>
        <EdPage
          pageKey={pageKey}
          doc={doc}
          site={site}
          data={data}
          slots={slots}
          editing={editing}
        />
      </main>
      {site?.footer?.hidden ? null : <EditorialFooter catNames={catNames} />}
      <CartDrawer />
      <FloatingCart />
    </EditorialProvider>
  )
}
